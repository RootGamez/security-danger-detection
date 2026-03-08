import type { DetectionPayload } from "../../types/domain";
import type { UIRefs } from "../refs";
import { colorForClass } from "../utils/colors";

export const renderDetections = (refs: UIRefs, detections: DetectionPayload[]) => {
  if (detections.length === 0) {
    refs.resultsBox.innerHTML = '<p style="font-size:.78rem;color:#475569;padding:6px 0">Sin detecciones.</p>';
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
};
