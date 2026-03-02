import os
from typing import List, Dict

from ultralytics import YOLO

DATASET_YAML = "datasets/data.yaml"
OUTPUT_DIR = "evidencias"
# Auto-detect latest weights from runs/detect/
RUNS_DIR = "../runs/detect"
DEFAULT_WEIGHTS = "yolov8n.pt"
DANGERS = ["fire", "smoke", "person"]  # case-insensitive comparison

os.makedirs(OUTPUT_DIR, exist_ok=True)


def find_latest_weights(base_dir: str = RUNS_DIR) -> str | None:
    """Find the latest best.pt or last.pt in runs/detect/train* directories."""
    if not os.path.exists(base_dir):
        return None
    
    weights_files = []
    for root, dirs, files in os.walk(base_dir):
        for fname in files:
            if fname.endswith(".pt"):
                full_path = os.path.join(root, fname)
                weights_files.append(full_path)
    
    if not weights_files:
        return None
    
    # Sort by modification time, return most recent
    weights_files.sort(key=os.path.getmtime)
    return weights_files[-1]


def train_model(
    data_yaml: str = DATASET_YAML,
    base_weights: str = DEFAULT_WEIGHTS,
    epochs: int = 50,
    imgsz: int = 640,
    patience: int = 10,
) -> YOLO:
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[INFO] Starting fine-tune on {device}...")
    model = YOLO(base_weights)
    model.train(data=data_yaml, epochs=epochs, imgsz=imgsz, device=device, patience=patience)
    print("[INFO] Training complete.")
    return model


def load_model(
    weights_path: str | None = None,
    train_mode: bool = False,
    force_cpu: bool = False,
    **train_kwargs,
) -> YOLO:
    import torch
    
    if train_mode:
        return train_model(**train_kwargs)

    # Try to use provided path, or find latest, or use default base model
    weights = weights_path or find_latest_weights() or DEFAULT_WEIGHTS
    
    print(f"[INFO] Loading model from {weights}")
    model = YOLO(weights)
    
    # Device selection with compatibility check
    if force_cpu:
        device = "cpu"
        print("[INFO] Forcing CPU mode (force_cpu=True)")
    elif torch.cuda.is_available():
        # Check if GPU is compatible (sm_70+)
        try:
            capability = torch.cuda.get_device_capability()
            major, minor = capability
            if major < 7:  # CUDA capability < 7.0
                print(f"[WARN] GPU capability sm_{major}{minor} < sm_70, using CPU")
                device = "cpu"
            else:
                device = "cuda"
        except Exception:
            device = "cpu"
    else:
        device = "cpu"
    
    model.to(device)
    print(f"[INFO] Model loaded on {device}")
    
    return model


def analyse_frame(model: YOLO, frame) -> List[Dict]:
    """Analyse a raw BGR numpy frame (from cv2.VideoCapture) and return detections."""
    detections: List[Dict] = []
    results = model(frame, verbose=False)
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            class_name = model.names[cls_id]
            if class_name.lower() not in DANGERS:
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


def analyse_image(model: YOLO, image_path: str) -> List[Dict[str, float]]:
    detections: List[Dict[str, float]] = []
    results = model(image_path)

    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            class_name = model.names[cls_id]
            if class_name.lower() not in DANGERS:
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
