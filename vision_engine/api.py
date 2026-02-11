import os
import tempfile
from typing import Dict, List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from model_utils import load_model, analyse_image

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
