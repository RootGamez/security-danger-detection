/**
 * Video feature — handles video file upload, SSE frame streaming, and
 * requestAnimationFrame-based overlay synchronisation during playback.
 */

import { streamVideoDetections } from "../services/detection.api";
import type { AppState } from "../state/app.state";
import type { VideoFramePayload } from "../types/domain";
import { getDetectionArray, getDetectionCount } from "../types/domain";
import type { UIRefs } from "../ui/refs";
import { resetPreview } from "../ui/components/preview";
import { drawOverlayBoxes, drawOverlayBoxesOnVideo } from "../ui/components/overlay";
import { renderDetections } from "../ui/components/results";
import { setStatus } from "../ui/components/status";

export type VideoHandler = (file: File) => void;

// ── Timeline helpers ────────────────────────────────────────────────────────

/**
 * Binary-search the timeline for the last frame whose `t` ≤ `currentTime`.
 */
const findFrame = (
  timeline: VideoFramePayload[],
  currentTime: number
): VideoFramePayload | null => {
  if (timeline.length === 0) return null;
  let lo = 0;
  let hi = timeline.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((timeline[mid].t ?? 0) <= currentTime) lo = mid;
    else hi = mid - 1;
  }
  return (timeline[lo].t ?? 0) <= currentTime ? timeline[lo] : null;
};

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

    // ── rAF overlay sync loop ────────────────────────────────────────────────
    const startRaf = () => {
      const tick = () => {
        if (!refs.previewVideo.paused && !refs.previewVideo.ended) {
          const frame = findFrame(state.frameTimeline, refs.previewVideo.currentTime);
          if (frame) drawOverlayBoxesOnVideo(refs, getDetectionArray(frame.detections));
          else refs.overlayLayer.innerHTML = "";
        }
        state.rafId = requestAnimationFrame(tick);
      };
      state.rafId = requestAnimationFrame(tick);
    };

    refs.previewVideo.addEventListener(
      "seeked",
      () => {
        const frame = findFrame(state.frameTimeline, refs.previewVideo.currentTime);
        drawOverlayBoxesOnVideo(refs, getDetectionArray(frame?.detections ?? []));
      },
      { once: false }
    );

    state.videoStreamAbort = streamVideoDetections(
      file,
      (frame) => {
        state.frameTimeline.push(frame);
        framesReceived++;

        if (!finished) {
          setStatus(refs, `Analizando... ${framesReceived} fotogramas procesados`, true);

          if (frame.frame) {
            const arr = getDetectionArray(frame.detections);
            if (arr.length > 0) {
              refs.previewImg.onload = () => drawOverlayBoxes(refs, arr);
            }
            refs.previewImg.src = `data:image/jpeg;base64,${frame.frame}`;
          }

          const arr = getDetectionArray(frame.detections);
          const count = getDetectionCount(frame.detections);
          if (arr.length > 0) {
            renderDetections(refs, arr);
          } else if (count > 0) {
            refs.resultsBox.innerHTML = `<p class="result-hint">🔍 ${count} objeto(s) detectado(s)</p>`;
          }
        }
      },
      () => {
        finished = true;
        state.frameTimeline.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
        setStatus(refs, `Video analizado — ${framesReceived} fotogramas`, false);
      },
      (err) => {
        console.error(err);
        refs.resultsBox.innerHTML = '<p class="result-error">No se pudo procesar el video.</p>';
        setStatus(refs, "Fallo al analizar video", false);
      }
    );
  };
