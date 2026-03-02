/**
 * Webcam feature — toggles a live webcam/camera-URL stream.
 * Manages its own button state and the live badge lifecycle.
 */

import { streamWebcamDetections } from "../services/detection.api";
import type { AppState } from "../state/app.state";
import { getDetectionArray, getDetectionCount } from "../types/domain";
import type { UIRefs } from "../ui/refs";
import { resetPreview } from "../ui/components/preview";
import { renderDetections } from "../ui/components/results";
import { setStatus } from "../ui/components/status";
import { showLiveBadge } from "../ui/components/live-badge";
import { webcamBtnLabelStart, webcamBtnLabelStop } from "../ui/utils/icons";

export type WebcamHandler = (cameraSource?: string) => void;

const resetWebcamButton = (btn: HTMLButtonElement): void => {
  btn.classList.remove("active");
  btn.innerHTML = webcamBtnLabelStart();
};

export const createWebcamHandler = (
  refs: UIRefs,
  state: AppState,
  stopStream: () => void
): WebcamHandler =>
  (cameraSource?: string): void => {
    // Toggle off if the webcam is already running
    if (state.webcamModeActive) {
      stopStream();
      setStatus(refs, "Camara detenida.", false);
      return;
    }

    state.webcamModeActive = true;
    state.canvasCtx = null;
    stopStream();
    state.webcamModeActive = true; // restore after stopStream reset

    resetPreview(refs);
    refs.previewImg.classList.remove("hidden");
    refs.resultsBox.innerHTML = "";

    // Button → stop state
    refs.webcamBtn.classList.add("active");
    refs.webcamBtn.innerHTML = webcamBtnLabelStop();

    showLiveBadge(refs.previewContainer, true);
    const sourceLabel = cameraSource ?? "predeterminada";
    setStatus(refs, `Conectando camara (${sourceLabel})...`, true);

    let framesReceived = 0;

    state.videoStreamAbort = streamWebcamDetections(
      (frame) => {
        if (!state.webcamModeActive) return;
        framesReceived++;

        const count = getDetectionCount(frame.detections);
        setStatus(refs, `Camara activa · ${framesReceived} frames · ${count} detecciones`, true);

        if (frame.frame) {
          refs.previewImg.src = `data:image/jpeg;base64,${frame.frame}`;
        }

        const arr = getDetectionArray(frame.detections);
        if (arr.length > 0) {
          renderDetections(refs, arr);
        } else if (count > 0) {
          refs.resultsBox.innerHTML = `<p class="result-hint">🔍 ${count} objeto(s) detectado(s)</p>`;
        } else if (framesReceived % 30 === 0) {
          refs.resultsBox.innerHTML = '<p class="result-empty">Sin detecciones.</p>';
        }
      },
      () => {
        showLiveBadge(refs.previewContainer, false);
        setStatus(refs, `Camara finalizada · ${framesReceived} frames`, false);
        resetWebcamButton(refs.webcamBtn);
        state.webcamModeActive = false;
      },
      (err) => {
        showLiveBadge(refs.previewContainer, false);
        console.error(err);
        refs.resultsBox.innerHTML = `<p class="result-error">${err.message}</p>`;
        setStatus(refs, "Fallo al conectar camara", false);
        resetWebcamButton(refs.webcamBtn);
        state.webcamModeActive = false;
      },
      cameraSource ? { cameraSource } : undefined
    );
  };
