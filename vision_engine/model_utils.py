import os
from typing import List, Dict, Tuple

from ultralytics import YOLO

DATASET_YAML = "datasets/data.yaml"
OUTPUT_DIR = "evidencias"
RUNS_DIR = "../runs/detect"

DEFAULT_WEIGHTS = "yolo11m.pt"

# Clases COCO que queremos auditar
DANGERS = ["person", "knife", "backpack", "suitcase", "cell phone", "dog"]

# Umbral de confianza para disparar una alerta de seguridad
ALERTA_CONF_THRESHOLD = 0.60

# Mapa objeto → etiqueta legible de la alerta
OBJETOS_PELIGROSOS: Dict[str, str] = {
    "knife": "Arma Blanca Detectada",
    "backpack": "Mochila / Objeto Sospechoso",
    "suitcase": "Maleta Sospechosa",
    "cell phone": "Uso de Celular en Zona Restringida",
    "dog": "Infracción Sanitaria: Animal Detectado",
}

os.makedirs(OUTPUT_DIR, exist_ok=True)


def _pick_torch_device(force_cpu: bool) -> str:
    import torch

    if force_cpu or not torch.cuda.is_available():
        return "cpu"

    try:
        capability = torch.cuda.get_device_capability(0)
        arch_list = set(torch.cuda.get_arch_list())
        device_arch = f"sm_{capability[0]}{capability[1]}"

        if arch_list and device_arch not in arch_list:
            print(
                f"[WARN] CUDA detectado pero no compatible con la build actual de PyTorch "
                f"({device_arch} no esta en {sorted(arch_list)}). Usando CPU."
            )
            return "cpu"

        return "cuda"
    except Exception as exc:
        print(f"[WARN] No se pudo validar la compatibilidad CUDA: {exc}. Usando CPU.")
        return "cpu"


def load_model(weights_path: str | None = None, force_cpu: bool = False, **kwargs) -> YOLO:
    weights = weights_path or DEFAULT_WEIGHTS
    print(f"[INFO] Cargando modelo desde {weights}")
    model = YOLO(weights)

    device = _pick_torch_device(force_cpu)

    try:
        model.to(device)
    except Exception as exc:
        if device != "cpu":
            print(f"[WARN] Fallo al mover el modelo a {device}: {exc}. Reintentando en CPU.")
            device = "cpu"
            model.to(device)
        else:
            raise

    setattr(model, "_audit_device", device)
    print(f"[INFO] AuditSentinel cargado en {device}")
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
            class_name = model.names[cls_id].lower()
            if class_name not in DANGERS:
                continue
            conf = float(box.conf[0]) if box.conf is not None else 0.0
            xyxy = box.xyxy[0].tolist()
            bbox = [float(coord) for coord in xyxy]
            detections.append({
                "class": class_name,
                "confidence": round(conf, 3),
                "bbox": [round(coord, 2) for coord in bbox],
            })
    return detections


def analyse_frame(model: YOLO, frame) -> Tuple[List[Dict], List[Dict]]:
    """Analiza un frame BGR. Devuelve (detections, alerts)."""
    results = model(frame, verbose=False)
    detections = _extract_detections(model, results)
    alerts = detect_security_alerts(detections)
    return detections, alerts


def analyse_frame_stream(model: YOLO, frame):
    target_classes = [class_id for class_id, name in model.names.items() if name.lower() in DANGERS]
    results = model(frame, conf=0.35, classes=target_classes, verbose=False)
    detections = _extract_detections(model, results)
    alerts = detect_security_alerts(detections)

    if len(results[0].boxes) > 0:
        annotated_frame = results[0].plot(conf=True)
    else:
        annotated_frame = frame

    return detections, alerts, annotated_frame


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
