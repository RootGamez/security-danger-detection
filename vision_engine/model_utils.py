import os
from typing import List, Dict, Tuple

from ultralytics import YOLO

DATASET_YAML = "datasets/data.yaml"
OUTPUT_DIR = "evidencias"
DEFAULT_WEIGHTS = "yolo11n.pt"   # YOLOv11 Nano — velocidad sin lag

# Clases COCO que queremos auditar
DANGERS = ["dog", "knife", "backpack"]

# Umbral de confianza para disparar una alerta de seguridad
ALERTA_CONF_THRESHOLD = 0.60

# Mapa objeto → etiqueta legible de la alerta
OBJETOS_PELIGROSOS: Dict[str, str] = {
    "knife":    "Arma Blanca Detectada",
    "backpack": "Mochila / Objeto Sospechoso",
    "dog":      "Infracción Sanitaria: Animal Detectado",
}

os.makedirs(OUTPUT_DIR, exist_ok=True)


def load_model(weights_path: str | None = None, force_cpu: bool = False, **kwargs) -> YOLO:
    import torch
    weights = weights_path or DEFAULT_WEIGHTS
    print(f"[INFO] Cargando modelo desde {weights}")
    model = YOLO(weights)

    if force_cpu:
        device = "cpu"
    elif torch.cuda.is_available():
        try:
            capability = torch.cuda.get_device_capability()
            device = "cuda" if capability[0] >= 7 else "cpu"
        except Exception:
            device = "cpu"
    else:
        device = "cpu"

    model.to(device)
    print(f"[INFO] Modelo cargado en {device}")
    return model


# ─────────────────────────────────────────────────────────────────────────────
# Alertas de seguridad
# ─────────────────────────────────────────────────────────────────────────────

def detect_security_alerts(all_detections: List[Dict]) -> List[Dict]:
    """Genera alertas para objetos peligrosos con confianza >= ALERTA_CONF_THRESHOLD."""
    alerts: List[Dict] = []
    for det in all_detections:
        clase = det["class"].lower()
        if clase in OBJETOS_PELIGROSOS and det["confidence"] >= ALERTA_CONF_THRESHOLD:
            alerts.append({
                "type":       OBJETOS_PELIGROSOS[clase],
                "confidence": det["confidence"],
                "bbox":       det["bbox"],
                "class":      clase,
            })
    return alerts


# ─────────────────────────────────────────────────────────────────────────────
# Helpers de análisis
# ─────────────────────────────────────────────────────────────────────────────

def _extract_detections(model: YOLO, results) -> List[Dict]:
    """Convierte resultados de ultralytics en lista de dicts de detección."""
    detections: List[Dict] = []
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            class_name = model.names[cls_id]
            if class_name.lower() not in DANGERS:
                continue
            conf = float(box.conf[0]) if box.conf is not None else 0.0
            xyxy = box.xyxy[0].tolist()
            bbox = [float(coord) for coord in xyxy]
            detections.append({
                "class":      class_name,
                "confidence": round(conf, 3),
                "bbox":       [round(coord, 2) for coord in bbox],
            })
    return detections


def analyse_frame(model: YOLO, frame) -> Tuple[List[Dict], List[Dict]]:
    """Analiza un frame BGR. Devuelve (detections, alerts)."""
    results = model(frame, verbose=False)
    detections = _extract_detections(model, results)
    alerts = detect_security_alerts(detections)
    return detections, alerts


def analyse_image(model: YOLO, image_path: str) -> Tuple[List[Dict], List[Dict]]:
    """Analiza una imagen. Devuelve (detections, alerts)."""
    results = model(image_path)
    detections = _extract_detections(model, results)
    alerts = detect_security_alerts(detections)
    return detections, alerts


def save_plotted_results(model: YOLO, image_path: str, output_dir: str = OUTPUT_DIR) -> None:
    results = model(image_path)
    for r in results:
        fname = os.path.basename(image_path)
        save_path = os.path.join(output_dir, f"detected_{fname}")
        r.save(filename=save_path)
