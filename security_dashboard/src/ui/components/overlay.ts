import type { DetectionPayload } from "../../lib/types";
import type { UIRefs } from "../types";

const colorForClass = (cls: string) => {
  if (cls === "fire") return "#fb7185";
  if (cls === "smoke") return "#94a3b8";
  return "#34d399";
};

export const drawOverlayBoxes = (refs: UIRefs, detections: DetectionPayload[]) => {
  refs.overlayLayer.innerHTML = "";
  if (!refs.previewImg.naturalWidth || !refs.previewImg.naturalHeight || detections.length === 0) {
    return;
  }

  const scaleX = refs.previewImg.clientWidth / refs.previewImg.naturalWidth;
  const scaleY = refs.previewImg.clientHeight / refs.previewImg.naturalHeight;

  detections.forEach((d) => {
    const [x1, y1, x2, y2] = d.bbox;
    const width = Math.max(x2 - x1, 1);
    const height = Math.max(y2 - y1, 1);
    const color = colorForClass(d.class);

    const box = document.createElement("div");
    box.className = "overlay-marker";
    box.style.left = `${x1 * scaleX}px`;
    box.style.top = `${y1 * scaleY}px`;
    box.style.width = `${width * scaleX}px`;
    box.style.height = `${height * scaleY}px`;
    box.style.borderColor = color;
    box.style.boxShadow = `0 0 20px ${color}55`;

    const label = document.createElement("span");
    label.textContent = `${d.class} ${(d.confidence * 100).toFixed(0)}%`;
    label.style.backgroundColor = "rgba(15, 23, 42, 0.85)";
    label.style.color = "#fff";
    label.style.borderColor = color;
    label.style.borderStyle = "solid";
    label.style.borderWidth = "1px";

    box.appendChild(label);
    refs.overlayLayer.appendChild(box);
  });
};
