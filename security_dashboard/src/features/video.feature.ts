/**
 * Video feature — handles video file upload, SSE frame streaming, and
 * requestAnimationFrame-based overlay synchronisation during playback.
 */

import { streamVideoDetections } from "../services/detection.api";
import { DetectionAccumulator } from "../services/history.service";
import type { AppState } from "../state/app.state";
import { getDetectionArray, getDetectionCount } from "../types/domain";
import type { UIRefs } from "../ui/refs";
import { resetPreview } from "../ui/components/preview";
import { renderDetections } from "../ui/components/results";
import { setStatus } from "../ui/components/status";
import { showAlertToasts } from "../ui/components/alert-toast";

export type VideoHandler = (file: File) => void;

// ── Factory ─────────────────────────────────────────────────────────────────

export const createVideoHandler = (
  refs: UIRefs,
  state: AppState,
  stopStream: () => void
): VideoHandler =>
  (file: File): void => {
    state.webcamModeActive = false;
    stopStream();

    // Hide all media elements; use <img> for base64 frames sent by backend
    resetPreview(refs);
    refs.previewImg.classList.remove("hidden");

    setStatus(refs, "Subiendo video y analizando...", true);
    refs.resultsBox.innerHTML = "";
    state.frameTimeline = [];

    let framesReceived = 0;
    let finished = false;

    const acc = new DetectionAccumulator("video", file.name);
    state.pendingAccumulator = acc;

    state.videoStreamAbort = streamVideoDetections(
      file,
      (frame) => {
        state.frameTimeline.push(frame);
        framesReceived++;

        if (!finished) {
          setStatus(refs, `Analizando... ${framesReceived} fotogramas procesados`, true);

          if (frame.frame) {
            refs.previewImg.src = `data:image/jpeg;base64,${frame.frame}`;
          }

          const arr = getDetectionArray(frame.detections);
          acc.addFrame(arr, frame.alerts);

          const count = getDetectionCount(frame.detections);
          if (arr.length > 0) {
            renderDetections(refs, arr);
          } else if (count > 0) {
            refs.resultsBox.innerHTML = `<p class="result-hint">🔍 ${count} objeto(s) detectado(s)</p>`;
          }

          // 🔔 Safety alerts
          showAlertToasts(frame.alerts);
        }
      },
      () => {
        finished = true;
        acc.finalize();
        state.pendingAccumulator = null;
        state.frameTimeline.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
        setStatus(refs, `Video analizado — ${framesReceived} fotogramas`, false);
      },
      (err) => {
        acc.finalize();
        state.pendingAccumulator = null;
        console.error(err);
        refs.resultsBox.innerHTML = '<p class="result-error">No se pudo procesar el video.</p>';
        setStatus(refs, "Fallo al analizar video", false);
      }
    );
  };
