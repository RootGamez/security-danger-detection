import type { DetectionPayload } from "../../lib/types";
import type { UIRefs } from "../types";
import { drawOverlayBoxes } from "./overlay";

export const renderDetections = (refs: UIRefs, detections: DetectionPayload[]) => {
  if (detections.length === 0) {
    refs.resultsBox.innerHTML = '<p class="text-slate-300">Sin detecciones.</p>';
    refs.overlayLayer.innerHTML = "";
    return;
  }

  refs.resultsBox.innerHTML = detections
    .map(
      (d) => `
        <div class="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-accent-500"></span>
            <span class="capitalize">${d.class}</span>
          </div>
          <span class="text-slate-200 text-xs">Conf: ${(d.confidence * 100).toFixed(1)}%</span>
        </div>
      `
    )
    .join("");

  drawOverlayBoxes(refs, detections);
};
