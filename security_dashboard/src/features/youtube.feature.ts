/**
 * YouTube feature — streams per-frame detections from a YouTube URL.
 */

import { streamYoutubeDetections } from "../services/detection.api";
import { DetectionAccumulator } from "../services/history.service";
import type { AppState } from "../state/app.state";
import { getDetectionArray, getDetectionCount } from "../types/domain";
import type { UIRefs } from "../ui/refs";
import { resetPreview } from "../ui/components/preview";
import { renderDetections } from "../ui/components/results";
import { setStatus } from "../ui/components/status";
import { showAlertToasts } from "../ui/components/alert-toast";

export type YoutubeHandler = (url: string) => void;

export const createYoutubeHandler = (
  refs: UIRefs,
  state: AppState,
  stopStream: () => void
): YoutubeHandler =>
  (url: string): void => {
    if (!url.trim()) return;

    state.webcamModeActive = false;
    stopStream();

    resetPreview(refs);
    refs.previewImg.classList.remove("hidden");
    refs.resultsBox.innerHTML = "";
    setStatus(refs, "Descargando y analizando video de YouTube...", true);

    let framesReceived = 0;

    const urlLabel = url.length > 40 ? url.slice(0, 37) + "..." : url;
    const acc = new DetectionAccumulator("youtube", urlLabel);
    state.pendingAccumulator = acc;

    state.videoStreamAbort = streamYoutubeDetections(
      url,
      (frame) => {
        state.frameTimeline.push(frame);
        framesReceived++;

        const count = getDetectionCount(frame.detections);
        setStatus(refs, `Analizando... ${framesReceived} fotogramas · ${count} detecciones`, true);

        if (frame.frame) {
          refs.previewImg.src = `data:image/jpeg;base64,${frame.frame}`;
        }

        const arr = getDetectionArray(frame.detections);
        acc.addFrame(arr, frame.alerts);

        if (arr.length > 0) {
          renderDetections(refs, arr);
        } else if (count > 0) {
          refs.resultsBox.innerHTML = `<p class="result-hint">🔍 ${count} objeto(s) detectado(s)</p>`;
        }

        // 🔔 Safety alerts
        showAlertToasts(frame.alerts);
      },
      () => {
        acc.finalize();
        state.pendingAccumulator = null;
        state.frameTimeline.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
        setStatus(refs, `Video analizado — ${framesReceived} fotogramas`, false);
      },
      (err) => {
        acc.finalize();
        state.pendingAccumulator = null;
        console.error(err);
        refs.resultsBox.innerHTML = `<p class="result-error">${err.message}</p>`;
        setStatus(refs, "Fallo al analizar video", false);
      }
    );
  };
