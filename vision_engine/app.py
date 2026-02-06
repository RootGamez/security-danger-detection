import os
from ultralytics import YOLO
import cv2

DATASET_YAML = "datasets/data.yaml"
OUTPUT_DIR = "evidencias"
TRAIN_MODE = True  # Cambia a False si ya entrenaste y solo quieres inferir
SEARCH_PATH = "datasets"  # Puedes apuntar a datasets/valid/images para probar validación

os.makedirs(OUTPUT_DIR, exist_ok=True)

DANGERS = ["fire", "smoke", "person"]


def train_model() -> YOLO:
    print("[INFO] Starting fine-tune...")
    model = YOLO("yolov8n.pt")
    model.train(data=DATASET_YAML, epochs=10, imgsz=640, device="cpu")
    print("[INFO] Training complete.")
    return model


def load_model() -> YOLO:
    if TRAIN_MODE:
        return train_model()

    best_path = "runs/detect/train/weights/best.pt"
    if os.path.exists(best_path):
        print(f"[INFO] Loading trained model from {best_path}")
        return YOLO(best_path)

    print("[WARN] No trained model found. Using base (will not detect fire/smoke).")
    return YOLO("yolov8n.pt")


def main() -> None:
    model = load_model()

    print(f"[INFO] Scanning images in: {SEARCH_PATH}")
    found_images = False

    for root, _, files in os.walk(SEARCH_PATH):
        for fname in files:
            if not fname.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                continue

            found_images = True
            fpath = os.path.join(root, fname)
            print(f"[INFO] Analysing: {fname}...")

            results = model(fpath)
            detected_dangers = []

            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    class_name = model.names[cls_id]
                    detected_dangers.append(class_name)

                if detected_dangers:
                    print(f"[ALERT] Danger detected in {fname}: {detected_dangers}")
                    img_plotted = r.plot()
                    save_path = os.path.join(OUTPUT_DIR, f"detected_{fname}")
                    cv2.imwrite(save_path, img_plotted)
                else:
                    print(f"[INFO] Clear scene: {fname}")

    if not found_images:
        print("[WARN] No images found. Ensure datasets/ has images (train/valid/test).")


if __name__ == "__main__":
    main()
