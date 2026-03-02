/**
 * YouTube feature — streams per-frame detections from a YouTube URL.
 */

import { streamYoutubeDetections } from "../services/detection.api";
import type { AppState } from "../state/app.state";
import { getDetectionArray, getDetectionCount } from "../types/domain";
import type { UIRefs } from "../ui/refs";
import { resetPreview } from "../ui/components/preview";
import { renderDetections } from "../ui/components/results";
import { setStatus } from "../ui/components/status";

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
        if (arr.length > 0) {
          renderDetections(refs, arr);
        } else if (count > 0) {
          refs.resultsBox.innerHTML = `<p class="result-hint">🔍 ${count} objeto(s) detectado(s)</p>`;
        }
      },
      () => {
        state.frameTimeline.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
        setStatus(refs, `Video analizado — ${framesReceived} fotogramas`, false);
      },
      (err) => {
        console.error(err);
        refs.resultsBox.innerHTML = `<p class="result-error">${err.message}</p>`;
        setStatus(refs, "Fallo al analizar video", false);
      }
    );
  };
