import asyncio
import base64
import json
import os
import re
import tempfile
from typing import AsyncGenerator, Dict, List

import cv2
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from model_utils import load_model, analyse_image, analyse_frame

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))


def _get_env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _get_env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


DEFAULT_CAMERA_SOURCE = (os.getenv("CAMERA_SOURCE") or "").strip() or None
DEFAULT_CAMERA_DEVICE_INDEX = _get_env_int("CAMERA_DEVICE_INDEX", 0)
DEFAULT_CAMERA_MAX_FPS = _get_env_float("CAMERA_MAX_FPS", 10.0)

app = FastAPI(title="Security Danger Detection API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = load_model()
webcam_lock = asyncio.Lock()


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


class Detection(BaseModel):
    class_name: str = Field(..., alias="class")
    confidence: float
    bbox: List[float]


class PredictionResponse(BaseModel):
    detections: List[Detection]


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> PredictionResponse:
    if file.content_type not in {"image/jpeg", "image/png", "image/bmp", "image/webp"}:
        raise HTTPException(status_code=415, detail="Solo se aceptan imágenes")

    suffix = os.path.splitext(file.filename or "image")[-1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        temp_path = tmp.name

    try:
        detections = analyse_image(model, temp_path)
        return PredictionResponse(detections=detections)
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


YOUTUBE_REGEX = re.compile(
    r"(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[\w-]+"
)


@app.post("/predict/youtube")
async def predict_youtube(payload: dict) -> StreamingResponse:
    url: str = (payload.get("url") or "").strip()
    if not url or not YOUTUBE_REGEX.search(url):
        raise HTTPException(status_code=422, detail="URL de YouTube no válida")

    import yt_dlp

    # Usar un directorio temporal para controlar el nombre exacto del archivo
    tmp_dir = tempfile.mkdtemp()
    output_template = os.path.join(tmp_dir, "video.%(ext)s")

    ydl_opts = {
        # Preferir un único archivo mp4 sin necesidad de merge (evita ffmpeg)
        "format": "best[ext=mp4][height<=720]/best[height<=720]/best",
        "outtmpl": output_template,
        "quiet": False,       # logs visibles para depuración
        "no_warnings": False,
        "merge_output_format": "mp4",
    }

    loop = asyncio.get_event_loop()
    download_error: str | None = None

    def _download():
        nonlocal download_error
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except Exception as exc:
            download_error = str(exc)

    await loop.run_in_executor(None, _download)

    if download_error:
        raise HTTPException(status_code=502, detail=f"Error al descargar: {download_error}")

    # Buscar el archivo descargado dentro del directorio temporal
    downloaded_files = [
        os.path.join(tmp_dir, f)
        for f in os.listdir(tmp_dir)
        if f.startswith("video.")
    ]

    if not downloaded_files:
        raise HTTPException(status_code=502, detail="No se encontró el archivo descargado. Puede que el video sea privado o no esté disponible.")

    actual_path = downloaded_files[0]

    # Validar que el archivo sea un video que OpenCV pueda abrir
    cap = cv2.VideoCapture(actual_path)
    valid = cap.isOpened() and cap.get(cv2.CAP_PROP_FRAME_COUNT) > 0
    cap.release()

    if not valid:
        try:
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass
        raise HTTPException(status_code=502, detail="El archivo descargado no es un video válido o está corrupto.")

    print(f"[INFO] YouTube video descargado: {actual_path} ({os.path.getsize(actual_path) // 1024} KB)")

    async def _stream_and_cleanup():
        try:
            async for chunk in _stream_video_detections(actual_path):
                yield chunk
        finally:
            try:
                import shutil
                shutil.rmtree(tmp_dir, ignore_errors=True)
            except Exception:
                pass

    return StreamingResponse(
        _stream_and_cleanup(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


VIDEO_TYPES = {
    "video/mp4", "video/avi", "video/x-msvideo", "video/quicktime",
    "video/x-matroska", "video/webm", "video/mpeg",
}


async def _stream_video_detections(temp_path: str) -> AsyncGenerator[str, None]:
    """Yield SSE events with per-frame detections and timestamps."""
    cap = cv2.VideoCapture(temp_path)
    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_idx = 0
        loop = asyncio.get_event_loop()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            timestamp = frame_idx / fps
            # Run inference in a thread so we don't block the event loop
            detections = await loop.run_in_executor(None, analyse_frame, model, frame)

            payload = json.dumps({"t": round(timestamp, 4), "detections": detections})
            yield f"data: {payload}\n\n"

            frame_idx += 1
            # small yield to keep event loop responsive
            await asyncio.sleep(0)

        yield "data: {\"done\": true}\n\n"
    finally:
        cap.release()
        try:
            os.remove(temp_path)
        except OSError:
            pass


def _open_webcam(device_index: int) -> cv2.VideoCapture:
    if os.name == "nt":
        cap = cv2.VideoCapture(device_index, cv2.CAP_DSHOW)
    else:
        cap = cv2.VideoCapture(device_index)
    return cap


def _open_camera_source(device_index: int) -> cv2.VideoCapture:
    source = (DEFAULT_CAMERA_SOURCE or "").strip()
    if not source:
        return _open_webcam(device_index)

    if source.isdigit():
        return _open_webcam(int(source))

    return cv2.VideoCapture(source)


async def _stream_webcam_detections(
    request: Request,
    cap: cv2.VideoCapture,
    *,
    max_fps: float,
    device_index: int,
    include_frame: bool,
) -> AsyncGenerator[str, None]:
    """Yield SSE events with per-frame detections from local webcam."""
    loop = asyncio.get_event_loop()
    frame_interval = 1.0 / max_fps
    started_at = loop.time()

    try:
        while True:
            if await request.is_disconnected():
                break

            frame_started_at = loop.time()
            ret, frame = await loop.run_in_executor(None, cap.read)
            if not ret:
                break

            timestamp = frame_started_at - started_at
            detections = await loop.run_in_executor(None, analyse_frame, model, frame)
            payload_dict = {
                "t": round(timestamp, 4),
                "detections": detections,
                "source": "webcam",
                "device_index": device_index,
            }
            if include_frame:
                render_frame = frame
                height, width = frame.shape[:2]
                max_width = 960
                if width > max_width:
                    scaled_height = int(height * (max_width / width))
                    render_frame = cv2.resize(frame, (max_width, max(1, scaled_height)))

                ok, encoded = cv2.imencode(
                    ".jpg",
                    render_frame,
                    [int(cv2.IMWRITE_JPEG_QUALITY), 70],
                )
                if ok:
                    payload_dict["frame"] = base64.b64encode(encoded.tobytes()).decode("ascii")

            payload = json.dumps(payload_dict)
            yield f"data: {payload}\n\n"

            elapsed = loop.time() - frame_started_at
            await asyncio.sleep(max(0.0, frame_interval - elapsed))

        yield "data: {\"done\": true}\n\n"
    finally:
        cap.release()
        if webcam_lock.locked():
            webcam_lock.release()


@app.post("/predict/video")
async def predict_video(file: UploadFile = File(...)) -> StreamingResponse:
    content_type = (file.content_type or "").split(";")[0].strip()
    # Also accept by extension when browser reports generic type
    ext = os.path.splitext(file.filename or "")[1].lower()
    allowed_exts = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".mpeg", ".mpg"}
    if content_type not in VIDEO_TYPES and ext not in allowed_exts:
        raise HTTPException(status_code=415, detail="Solo se aceptan videos")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext or ".mp4") as tmp:
        content = await file.read()
        tmp.write(content)
        temp_path = tmp.name

    return StreamingResponse(
        _stream_video_detections(temp_path),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/predict/webcam")
async def predict_webcam(
    request: Request,
    device_index: int | None = None,
    max_fps: float | None = None,
    include_frame: bool = True,
) -> StreamingResponse:
    effective_device_index = device_index if device_index is not None else DEFAULT_CAMERA_DEVICE_INDEX
    effective_max_fps = max_fps if max_fps is not None else DEFAULT_CAMERA_MAX_FPS

    if effective_device_index < 0:
        raise HTTPException(status_code=422, detail="device_index debe ser >= 0")
    if effective_max_fps <= 0 or effective_max_fps > 30:
        raise HTTPException(status_code=422, detail="max_fps debe estar entre 0 y 30")

    if webcam_lock.locked():
        raise HTTPException(status_code=409, detail="La webcam ya está en uso")

    await webcam_lock.acquire()
    cap = _open_camera_source(effective_device_index)
    if not cap.isOpened():
        webcam_lock.release()
        raise HTTPException(
            status_code=503,
            detail=(
                "No se pudo abrir la fuente de cámara. Verifica permisos, que no esté ocupada "
                "por otra app, o revisa CAMERA_SOURCE/CAMERA_DEVICE_INDEX en .env."
            ),
        )

    return StreamingResponse(
        _stream_webcam_detections(
            request,
            cap,
            max_fps=effective_max_fps,
            device_index=effective_device_index,
            include_frame=include_frame,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
