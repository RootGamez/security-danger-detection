import os
from typing import List, Dict

from ultralytics import YOLO

DATASET_YAML = "datasets/data.yaml"
OUTPUT_DIR = "evidencias"
DEFAULT_WEIGHTS = "../runs/detect/train3/weights/best.pt"
DEFAULT_DEVICE = "cpu"  # Forzar CPU por incompatibilidad de la GPU MX350 con el build de PyTorch
DANGERS = ["fire", "smoke", "person"]

os.makedirs(OUTPUT_DIR, exist_ok=True)


def train_model(
    data_yaml: str = DATASET_YAML,
    base_weights: str = DEFAULT_WEIGHTS,
    epochs: int = 10,
    imgsz: int = 640,
    device: str = DEFAULT_DEVICE,
) -> YOLO:
    print("[INFO] Starting fine-tune...")
    model = YOLO(base_weights)
    model.train(data=data_yaml, epochs=epochs, imgsz=imgsz, device=device)
    print("[INFO] Training complete.")
    return model


def load_model(
    weights_path: str | None = None,
    train_mode: bool = False,
    **train_kwargs,
) -> YOLO:
    if train_mode:
        return train_model(**train_kwargs)

    weights = weights_path or DEFAULT_WEIGHTS
    if os.path.exists(weights):
        print(f"[INFO] Loading trained model from {weights}")
        model = YOLO(weights)
        model.to(DEFAULT_DEVICE)
        return model

    print("[WARN] No trained model found. Using base (will not detect fire/smoke).")
    model = YOLO("yolov8n.pt")
    model.to(DEFAULT_DEVICE)
    return model


def analyse_image(model: YOLO, image_path: str) -> List[Dict[str, float]]:
    detections: List[Dict[str, float]] = []
    results = model(image_path)

    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            class_name = model.names[cls_id]
            if class_name not in DANGERS:
                continue
            conf = float(box.conf[0]) if box.conf is not None else 0.0
            xyxy = box.xyxy[0].tolist()
            bbox = [float(coord) for coord in xyxy]
            detections.append(
                {
                    "class": class_name,
                    "confidence": round(conf, 3),
                    "bbox": [round(coord, 2) for coord in bbox],
                }
            )

    return detections


def save_plotted_results(model: YOLO, image_path: str, output_dir: str = OUTPUT_DIR) -> None:
    results = model(image_path)
    for r in results:
        img_plotted = r.plot()
        fname = os.path.basename(image_path)
        save_path = os.path.join(output_dir, f"detected_{fname}")
        r.save(filename=save_path)
