import type { DetectionPayload } from "../../lib/types";
import type { UIRefs } from "../types";

const colorForClass = (cls: string) => {
  if (cls === "fire") return "#fb7185";
  if (cls === "smoke") return "#94a3b8";
  return "#34d399";
};

const buildBox = (
  d: DetectionPayload,
  scaleX: number,
  scaleY: number,
  offsetX: number,
  offsetY: number
): HTMLDivElement => {
  const [x1, y1, x2, y2] = d.bbox;
  const width = Math.max(x2 - x1, 1);
  const height = Math.max(y2 - y1, 1);
  const color = colorForClass(d.class);

  const box = document.createElement("div");
  box.className = "overlay-marker";
  box.style.left = `${offsetX + x1 * scaleX}px`;
  box.style.top = `${offsetY + y1 * scaleY}px`;
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
  return box;
};

export const drawOverlayBoxes = (refs: UIRefs, detections: DetectionPayload[]) => {
  refs.overlayLayer.innerHTML = "";
  if (!refs.previewImg.naturalWidth || !refs.previewImg.naturalHeight || detections.length === 0) {
    return;
  }

  const scaleX = refs.previewImg.clientWidth / refs.previewImg.naturalWidth;
  const scaleY = refs.previewImg.clientHeight / refs.previewImg.naturalHeight;

  // Center offset: image uses object-contain so may have letterboxing
  const containerRect = refs.previewContainer.getBoundingClientRect();
  const imgRect = refs.previewImg.getBoundingClientRect();
  const offsetX = imgRect.left - containerRect.left;
  const offsetY = imgRect.top - containerRect.top;

  detections.forEach((d) => {
    refs.overlayLayer.appendChild(buildBox(d, scaleX, scaleY, offsetX, offsetY));
  });
};

export const drawOverlayBoxesOnVideo = (refs: UIRefs, detections: DetectionPayload[]) => {
  refs.overlayLayer.innerHTML = "";
  if (!refs.previewVideo.videoWidth || !refs.previewVideo.videoHeight) return;

  const scaleX = refs.previewVideo.clientWidth / refs.previewVideo.videoWidth;
  const scaleY = refs.previewVideo.clientHeight / refs.previewVideo.videoHeight;

  // Center offset for letterboxing
  const containerRect = refs.previewContainer.getBoundingClientRect();
  const vidRect = refs.previewVideo.getBoundingClientRect();
  const offsetX = vidRect.left - containerRect.left;
  const offsetY = vidRect.top - containerRect.top;

  detections.forEach((d) => {
    refs.overlayLayer.appendChild(buildBox(d, scaleX, scaleY, offsetX, offsetY));
  });
};
