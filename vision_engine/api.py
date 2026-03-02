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

from model_utils import load_model, analyse_image

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

model = load_model(force_cpu=True)  # Force CPU for MX350 compatibility


@app.get("/health")
async def health() -> Dict[str, str]:
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return {"status": "ok", "device": device}


class Detection(BaseModel):
    class_name: str = Field(..., alias="class")
    confidence: float
    bbox: List[float]


class PredictionResponse(BaseModel):
    detections: List[Detection]


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> PredictionResponse:
    """Analyze a single image and return detection array."""
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


async def _stream_stable_detections(path: str | int, is_stream: bool = False) -> AsyncGenerator[str, None]:
    """
    Stream video frames with detections drawn on them (Colab style).
    Returns SSE events with: {"detections": count, "frame": base64_jpeg_with_boxes}
    
    Args:
        path: Video file path, webcam index (int), or stream URL (str)
        is_stream: If True, keep retrying on read failures (for live streams)
    """
    TARGET_WIDTH = 1080
    FRAME_SKIP = 5
    count = 0

    print(f"[DEBUG] Opening video source: {path} (type: {type(path).__name__})")
    cap = _open_video_capture(path)
    
    if not cap.isOpened():
        print(f"[ERROR] Failed to open video source: {path}")
        return
    
    print(f"[INFO] Video source opened successfully: {path}")
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                if is_stream:
                    await asyncio.sleep(0.5)
                    continue
                else:
                    print(f"[DEBUG] End of stream/video: {path}")
                    break

            count += 1
            if count % FRAME_SKIP != 0:
                continue

            # Resize to save bandwidth
            h, w = frame.shape[:2]
            if w > TARGET_WIDTH:
                new_h = int(h * (TARGET_WIDTH / w))
                frame = cv2.resize(frame, (TARGET_WIDTH, new_h))

            # Detection and drawing (boxes on frame)
            results = model(frame, conf=0.3, verbose=False)
            annotated_frame = results[0].plot()

            # Compress to base64
            _, buffer = cv2.imencode('.jpg', annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 20])
            frame_base64 = base64.b64encode(buffer).decode('utf-8')

            payload = {"detections": len(results[0].boxes), "frame": frame_base64}
            yield f"data: {json.dumps(payload)}\n\n"
            
            await asyncio.sleep(0.08)  # ~12fps output
            
    finally:
        cap.release()
        print(f"[INFO] Video source released: {path}")


# ─────────────────────────────────────────────────────────────────────────────
# YouTube endpoint
# ─────────────────────────────────────────────────────────────────────────────
YOUTUBE_REGEX = re.compile(
    r"(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[\w-]+"
)


@app.post("/predict/youtube")
async def predict_youtube(payload: dict) -> StreamingResponse:
    """Stream YouTube video analysis using direct stream URL (no download)."""
    url: str = (payload.get("url") or "").strip()
    if not url or not YOUTUBE_REGEX.search(url):
        raise HTTPException(status_code=422, detail="URL de YouTube no válida")

    import yt_dlp

    # Extract stream URL without downloading
    ydl_opts = {
        'format': 'best[height<=720]/best',
        'quiet': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            stream_url = info['url']
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error al extraer video: {str(exc)}")

    return StreamingResponse(
        _stream_stable_detections(stream_url, is_stream=True),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Video upload endpoint
# ─────────────────────────────────────────────────────────────────────────────
VIDEO_TYPES = {
    "video/mp4", "video/avi", "video/x-msvideo", "video/quicktime",
    "video/x-matroska", "video/webm", "video/mpeg",
}


@app.post("/predict/video")
async def predict_video(file: UploadFile = File(...)) -> StreamingResponse:
    """Stream uploaded video analysis."""
    content_type = (file.content_type or "").split(";")[0].strip()
    ext = os.path.splitext(file.filename or "")[1].lower()
    allowed_exts = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".mpeg", ".mpg"}
    
    if content_type not in VIDEO_TYPES and ext not in allowed_exts:
        raise HTTPException(status_code=415, detail="Solo se aceptan videos")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext or ".mp4") as tmp:
        content = await file.read()
        tmp.write(content)
        temp_path = tmp.name

    async def _stream_and_cleanup():
        try:
            async for chunk in _stream_stable_detections(temp_path, is_stream=False):
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
        _stream_stable_detections(source, is_stream=True),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
