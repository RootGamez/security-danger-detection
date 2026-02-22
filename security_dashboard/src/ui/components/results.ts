import type { DetectionPayload } from "../../lib/types";
import type { UIRefs } from "../types";
import { drawOverlayBoxes } from "./overlay";

const colorForClass = (cls: string) => {
  if (cls === "fire") return "#f87171";
  if (cls === "smoke") return "#94a3b8";
  return "#34d399";
};

export const renderDetections = (refs: UIRefs, detections: DetectionPayload[]) => {
  if (detections.length === 0) {
    refs.resultsBox.innerHTML = '<p style="font-size:.78rem;color:#475569;padding:6px 0">Sin detecciones.</p>';
    refs.overlayLayer.innerHTML = "";
    return;
  }

  refs.resultsBox.innerHTML = detections
    .map((d) => {
      const color = colorForClass(d.class);
      return `
        <div class="detection-card">
          <div class="detection-label">
            <span class="detection-dot" style="background:${color}"></span>
            <span style="text-transform:capitalize;font-weight:600">${d.class}</span>
          </div>
          <span class="detection-conf">${(d.confidence * 100).toFixed(1)}%</span>
        </div>`;
    })
    .join("");

  drawOverlayBoxes(refs, detections);
};
