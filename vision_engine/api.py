import asyncio
import json
import os
import tempfile
from typing import AsyncGenerator, Dict, List

import cv2
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from model_utils import load_model, analyse_image, analyse_frame

app = FastAPI(title="Security Danger Detection API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = load_model()


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
