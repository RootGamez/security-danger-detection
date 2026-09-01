import asyncio
import base64
import json
import os
import re
import tempfile
import threading
import time
from typing import AsyncGenerator, Dict, List

import cv2
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel, Field

from model_utils import (
    DANGERS,
    load_model,
    analyse_frame,
    analyse_frame_stream,
    analyse_image,
    _extract_detections,
    detect_security_alerts,
)

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


DEFAULT_CAMERA_SOURCE = (os.getenv("CAMERA_SOURCE") or "").strip() or None
DEFAULT_CAMERA_DEVICE_INDEX = _get_env_int("CAMERA_DEVICE_INDEX", 0)

app = FastAPI(title="Security Danger Detection API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FORCE_CPU = os.getenv("FORCE_CPU", "false").lower() == "true"
global_model = load_model(force_cpu=FORCE_CPU)
print("🔥 Inicializando IA para 4 cámaras simultáneas...")
TARGET_IDS = [class_id for class_id, name in global_model.names.items() if name.lower() in DANGERS]

# Perfil agresivo para reducir carga de CPU en multistream.
STREAM_TARGET_WIDTH = 360
STREAM_FRAME_SKIP = 4
STREAM_JPEG_QUALITY = 45

CAMERA_TARGET_WIDTH = 360
CAMERA_FRAME_SKIP = 4
CAMERA_JPEG_QUALITY = 45

# Umbral de confianza: el dashboard lo envía como ?conf=; si no llega, se usa
# el valor por defecto de cada endpoint.
MIN_CONF = 0.05
MAX_CONF = 0.95
DEFAULT_IMAGE_CONF = 0.25
DEFAULT_STREAM_CONF = 0.35


def _resolve_conf(value: float | None, default: float) -> float:
    """Acota el umbral recibido al rango admitido por el modelo."""
    if value is None:
        return default
    return max(MIN_CONF, min(MAX_CONF, float(value)))


# ── Formatos admitidos ─────────────────────────────────────────────────────
# La política es permisiva a propósito: OpenCV/FFMPEG abre muchos más
# contenedores de los que el navegador sabe etiquetar, y los MIME de .mkv o
# .avi llegan a menudo vacíos o como application/octet-stream.

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".jpe", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff",
    ".avif", ".jfif", ".pgm", ".ppm", ".pbm", ".dib", ".heic", ".heif",
    ".dng", ".mpo",
}

VIDEO_EXTENSIONS = {
    ".mp4", ".m4v", ".mov", ".avi", ".mkv", ".webm", ".mpeg", ".mpg", ".m2v",
    ".wmv", ".flv", ".f4v", ".3gp", ".3g2", ".ogv", ".ogm", ".ts", ".mts",
    ".m2ts", ".mxf", ".asf", ".divx", ".vob", ".dav",
}


def _upload_matches(file: UploadFile, kind: str, extensions: set[str]) -> bool:
    """True si el MIME o la extensión identifican el archivo como `kind`."""
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type.startswith(f"{kind}/"):
        return True
    return os.path.splitext(file.filename or "")[1].lower() in extensions


@app.middleware("http")
async def add_localtunnel_bypass_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["Bypass-Tunnel-Reminder"] = "true"
    return response


@app.get("/health")
async def health() -> Dict[str, str]:
    device = getattr(global_model, "_audit_device", "cpu")
    return {"status": "ok", "device": device}


# ====================================================================
# PARTE 1: SISTEMA MULTICAMARA EN VIVO (DASHBOARD)
# ====================================================================

class CameraStream:
    def __init__(self, cam_id: str, source: str | int):
        self.cam_id = cam_id
        self.source = source
        self.cap = _open_video_capture(source)
        self.latest_frame: bytes | None = None
        self.latest_detections: List[Dict] = []
        self.latest_alerts: List[Dict] = []
        self.last_event_ts = 0.0
        self.running = True
        self.frame_count = 0

        self.thread = threading.Thread(target=self.process_stream, daemon=True)
        self.thread.start()

    def process_stream(self) -> None:
        while self.running:
            success, frame = self.cap.read()
            if not success:
                self.cap.release()
                self.cap = _open_video_capture(self.source)
                time.sleep(1)
                continue

            self.frame_count += 1
            if self.frame_count % CAMERA_FRAME_SKIP != 0:
                continue

            h, w = frame.shape[:2]
            if w > CAMERA_TARGET_WIDTH:
                new_h = int(h * (CAMERA_TARGET_WIDTH / w))
                frame = cv2.resize(frame, (CAMERA_TARGET_WIDTH, new_h))

            detections, alerts, annotated = analyse_frame_stream(global_model, frame)
            self.latest_detections = detections
            self.latest_alerts = alerts
            self.last_event_ts = time.time()

            ret, buffer = cv2.imencode(
                ".jpg",
                annotated,
                [int(cv2.IMWRITE_JPEG_QUALITY), CAMERA_JPEG_QUALITY],
            )
            if ret:
                self.latest_frame = buffer.tobytes()

    def stop(self) -> None:
        self.running = False
        self.cap.release()


active_cameras: Dict[str, CameraStream] = {}


class CameraRequest(BaseModel):
    cam_id: str
    source: str


@app.post("/camera/add")
async def add_camera(req: CameraRequest):
    source = int(req.source) if req.source.isdigit() else req.source
    if req.cam_id in active_cameras:
        active_cameras[req.cam_id].stop()
    active_cameras[req.cam_id] = CameraStream(cam_id=req.cam_id, source=source)
    return {"message": f"Camara '{req.cam_id}' activa."}


def generate_mjpeg(cam_id: str):
    cam = active_cameras.get(cam_id)
    while cam and cam.running:
        if cam.latest_frame is not None:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + cam.latest_frame + b"\r\n"
            )
        time.sleep(0.05)


@app.get("/camera/{cam_id}/stream")
async def video_feed(cam_id: str):
    if cam_id not in active_cameras:
        raise HTTPException(status_code=404, detail="Camara no encontrada")
    return StreamingResponse(generate_mjpeg(cam_id), media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/camera/{cam_id}/events")
async def camera_events(cam_id: str) -> StreamingResponse:
    cam = active_cameras.get(cam_id)
    if not cam:
        raise HTTPException(status_code=404, detail="Camara no encontrada")

    async def _event_stream() -> AsyncGenerator[str, None]:
        last_ts = 0.0
        while cam and cam.running:
            if cam.last_event_ts > last_ts:
                last_ts = cam.last_event_ts
                payload = {
                    "cam_id": cam_id,
                    "detections": cam.latest_detections,
                    "alerts": cam.latest_alerts,
                    "ts": cam.last_event_ts,
                }
                yield f"data: {json.dumps(payload)}\n\n"
            await asyncio.sleep(0.2)

    return StreamingResponse(_event_stream(), media_type="text/event-stream")


@app.get("/", response_class=HTMLResponse)
async def dashboard() -> str:
    cam_html = "".join(
        [
            f"<div style='margin:10px;border:2px solid #444'>"
            f"<h3 style='color:#0f0'>Camara {c}</h3>"
            f"<img src='/camera/{c}/stream' width='480'>"
            f"</div>"
            for c in active_cameras
        ]
    )
    if not cam_html:
        cam_html = "<h3 style='color:red'>Sin camaras. Agrega una por POST /camera/add</h3>"
    return (
        "<html><body style='background:#111;color:white;text-align:center;'>"
        "<h1>AuditSentinel Dashboard</h1>"
        f"<div style='display:flex;justify-content:center;flex-wrap:wrap;'>{cam_html}</div>"
        "</body></html>"
    )


class Detection(BaseModel):
    class_name: str = Field(..., alias="class")
    confidence: float
    bbox: List[float]


class SecurityAlert(BaseModel):
    type: str
    confidence: float
    bbox: List[float]
    class_name: str = Field(..., alias="class")


class PredictionResponse(BaseModel):
    detections: List[Detection]
    alerts: List[SecurityAlert] = []


@app.post("/predict")
async def predict(file: UploadFile = File(...), conf: float | None = None):
    """Analiza una imagen y devuelve detecciones, alertas y el fotograma anotado."""
    if not _upload_matches(file, "image", IMAGE_EXTENSIONS):
        raise HTTPException(
            status_code=415,
            detail=f"Formato de imagen no admitido: {file.filename or 'archivo'}",
        )

    threshold = _resolve_conf(conf, DEFAULT_IMAGE_CONF)

    suffix = os.path.splitext(file.filename or "image")[-1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        temp_path = tmp.name

    try:
        try:
            results = await asyncio.to_thread(
                global_model,
                temp_path,
                conf=threshold,
                classes=TARGET_IDS,
                verbose=False,
            )
        except Exception as exc:
            # Extensión plausible que el decodificador no sabe abrir (HEIC sin
            # libheif, TIFF exótico...). Mejor un 415 claro que un 500 opaco.
            raise HTTPException(
                status_code=415,
                detail=f"No se pudo decodificar la imagen ({file.filename}): {exc}",
            ) from exc

        detections = _extract_detections(global_model, results)
        alerts = detect_security_alerts(detections)

        if len(results[0].boxes) > 0:
            annotated = results[0].plot(conf=True, line_width=4, font_size=1.5, labels=True)
        else:
            annotated = cv2.imread(temp_path)

        if annotated is None:
            raise HTTPException(
                status_code=415,
                detail=f"No se pudo leer la imagen ({file.filename}).",
            )

        _, buffer = cv2.imencode(".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        frame_b64 = base64.b64encode(buffer).decode("utf-8")

        return {
            "detections": detections,
            "alerts": alerts,
            "frame": frame_b64,
            "image": frame_b64,
        }
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# Master streaming function (Colab style)
# ─────────────────────────────────────────────────────────────────────────────
def _open_video_capture(source) -> cv2.VideoCapture:
    """Open VideoCapture with proper backend for device index."""
    if isinstance(source, int):
        # Use DSHOW backend on Windows for better webcam support
        if os.name == "nt":
            return cv2.VideoCapture(source, cv2.CAP_DSHOW)
        else:
            return cv2.VideoCapture(source)
    else:
        # String: check if it's a URL or file path
        if isinstance(source, str) and source.startswith(('http://', 'https://', 'rtsp://')):
            # Use FFMPEG backend for network streams (better compatibility)
            cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG)
            if not cap.isOpened():
                # Fallback to default backend
                cap = cv2.VideoCapture(source)
            return cap
        else:
            # Local file path
            return cv2.VideoCapture(source)


async def _stream_stable_detections(
    path: str | int,
    is_stream: bool = False,
    conf: float = DEFAULT_STREAM_CONF,
) -> AsyncGenerator[str, None]:
    """
    Emite los fotogramas anotados como eventos SSE:
    {"detections": [...], "alerts": [...], "frame": "<jpeg base64>"}

    Args:
        path: ruta de video, índice de webcam (int) o URL del stream (str)
        is_stream: si es True, reintenta ante fallos de lectura (fuentes en vivo)
        conf: umbral de confianza del modelo
    """
    count = 0

    print(f"[DEBUG] Opening video source: {path} (type: {type(path).__name__})")
    cap = _open_video_capture(path)
    
    if not cap.isOpened():
        print(f"[ERROR] Failed to open video source: {path}")
        return
    
    print(f"[INFO] Video source opened successfully: {path}")
    
    try:
        while True:
            ret, frame = await asyncio.to_thread(cap.read)
            if not ret:
                if is_stream:
                    await asyncio.sleep(0.5)
                    continue
                else:
                    print(f"[DEBUG] End of stream/video: {path}")
                    break

            count += 1
            if count % STREAM_FRAME_SKIP != 0:
                continue

            # Resize to save bandwidth and match the Colab stream profile.
            h, w = frame.shape[:2]
            if w > STREAM_TARGET_WIDTH:
                new_h = int(h * (STREAM_TARGET_WIDTH / w))
                frame = cv2.resize(frame, (STREAM_TARGET_WIDTH, new_h))

            # Detection and drawing (boxes on frame)
            results = await asyncio.to_thread(
                global_model,
                frame,
                conf=conf,
                classes=TARGET_IDS,
                verbose=False,
            )
            annotated_frame = results[0].plot()

            # Build detections + alerts
            dets = _extract_detections(global_model, results)
            security_alerts = detect_security_alerts(dets)

            # Compress to base64
            _, buffer = cv2.imencode(
                '.jpg',
                annotated_frame,
                [int(cv2.IMWRITE_JPEG_QUALITY), STREAM_JPEG_QUALITY],
            )
            frame_base64 = base64.b64encode(buffer).decode('utf-8')

            payload = {
                "detections": dets,
                "alerts": security_alerts,
                "frame": frame_base64,
            }
            yield f"data: {json.dumps(payload)}\n\n"
            
            await asyncio.sleep(0.01)
            
    finally:
        cap.release()
        print(f"[INFO] Video source released: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# YouTube endpoint
# ─────────────────────────────────────────────────────────────────────────────
# Cubre watch, youtu.be, shorts, live, embed y los subdominios m./music.
YOUTUBE_REGEX = re.compile(
    r"(https?://)?((www|m|music)\.)?"
    r"(youtube\.com/(watch\?(\S*&)?v=|shorts/|live/|embed/|v/)|youtu\.be/)"
    r"[\w-]{6,}"
)


@app.post("/predict/youtube")
async def predict_youtube(payload: dict, conf: float | None = None) -> StreamingResponse:
    """Analiza un video de YouTube leyendo su stream directo, sin descargarlo."""
    url: str = (payload.get("url") or "").strip()
    if not url or not YOUTUBE_REGEX.search(url):
        raise HTTPException(status_code=422, detail="URL de YouTube no válida")

    import yt_dlp

    # Extract stream URL without downloading
    ydl_opts = {
        'format': 'best[height<=360]/best',
        'quiet': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            stream_url = info['url']
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error al extraer video: {str(exc)}")

    return StreamingResponse(
        _stream_stable_detections(
            stream_url, is_stream=True, conf=_resolve_conf(conf, DEFAULT_STREAM_CONF)
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Video upload endpoint
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/predict/video")
async def predict_video(
    file: UploadFile = File(...),
    conf: float | None = None,
) -> StreamingResponse:
    """Analiza un video subido y emite los fotogramas anotados por SSE."""
    if not _upload_matches(file, "video", VIDEO_EXTENSIONS):
        raise HTTPException(
            status_code=415,
            detail=f"Formato de video no admitido: {file.filename or 'archivo'}",
        )

    ext = os.path.splitext(file.filename or "")[1].lower()
    threshold = _resolve_conf(conf, DEFAULT_STREAM_CONF)

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext or ".mp4") as tmp:
        content = await file.read()
        tmp.write(content)
        temp_path = tmp.name

    async def _stream_and_cleanup():
        try:
            async for chunk in _stream_stable_detections(
                temp_path, is_stream=False, conf=threshold
            ):
                yield chunk
        finally:
            try:
                os.remove(temp_path)
            except OSError:
                pass

    return StreamingResponse(
        _stream_and_cleanup(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Webcam endpoint
# ─────────────────────────────────────────────────────────────────────────────
def _get_camera_source(device_index: int | None, camera_source: str | None) -> str | int:
    """Determine camera source: custom URL, env var, or device index."""
    if camera_source:  # Frontend provided URL
        return camera_source
    
    if DEFAULT_CAMERA_SOURCE:  # .env has CAMERA_SOURCE
        if DEFAULT_CAMERA_SOURCE.isdigit():
            return int(DEFAULT_CAMERA_SOURCE)
        return DEFAULT_CAMERA_SOURCE
    
    # Use device index (default or provided)
    if device_index is not None:
        return device_index
    return DEFAULT_CAMERA_DEVICE_INDEX


@app.get("/predict/webcam")
async def predict_webcam(
    device_index: int | None = None,
    camera_source: str | None = None,
    conf: float | None = None,
) -> StreamingResponse:
    """
    Stream webcam/camera analysis.
    
    Args:
        device_index: Camera device index (0, 1, etc.) - deprecated, use camera_source
        camera_source: Camera URL (http://...) or device index as string
    """
    source = _get_camera_source(device_index, camera_source)
    print(f"[INFO] Webcam request - source: {source} (type: {type(source).__name__})")
    
    # Quick validation (open and immediately close)
    test_cap = _open_video_capture(source)
    if not test_cap.isOpened():
        test_cap.release()
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo abrir la cámara ({source}). Verifica permisos o la URL."
        )
    test_cap.release()
    
    # Small delay to let camera fully release before reopening
    await asyncio.sleep(0.2)

    return StreamingResponse(
        _stream_stable_detections(
            source, is_stream=True, conf=_resolve_conf(conf, DEFAULT_STREAM_CONF)
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
