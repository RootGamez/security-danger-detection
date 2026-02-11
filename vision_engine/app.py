import os
from typing import List

import cv2
from model_utils import load_model, analyse_image, OUTPUT_DIR

SEARCH_PATH = "datasets"  # Solo usado si se llama a main() localmente


def main() -> None:
    model_local = load_model()

    print(f"[INFO] Scanning images in: {SEARCH_PATH}")
    found_images = False

    for root, _, files in os.walk(SEARCH_PATH):
        for fname in files:
            if not fname.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                continue

            found_images = True
            fpath = os.path.join(root, fname)
            print(f"[INFO] Analysing: {fname}...")

            detections = analyse_image(model_local, fpath)

            if detections:
                classes = [d["class"] for d in detections]
                print(f"[ALERT] Danger detected in {fname}: {classes}")
                results = model_local(fpath)
                for r in results:
                    img_plotted = r.plot()
                    save_path = os.path.join(OUTPUT_DIR, f"detected_{fname}")
                    cv2.imwrite(save_path, img_plotted)
            else:
                print(f"[INFO] Clear scene: {fname}")

    if not found_images:
        print("[WARN] No images found. Ensure datasets/ has images (train/valid/test).")


if __name__ == "__main__":
    main()
