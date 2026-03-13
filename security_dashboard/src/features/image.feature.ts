/**
 * Image feature — handles still image file upload and detection.
 */

import { uploadAndPredict } from "../services/detection.api";
import { DetectionAccumulator } from "../services/history.service";
import type { AppState } from "../state/app.state";
import type { UIRefs } from "../ui/refs";
import { showPreview, resetPreview } from "../ui/components/preview";
import { renderDetections } from "../ui/components/results";
import { setStatus } from "../ui/components/status";
import { showAlertToasts } from "../ui/components/alert-toast";

export type ImageHandler = (file: File) => Promise<void>;

export const createImageHandler = (
  refs: UIRefs,
  state: AppState,
  stopStream: () => void
): ImageHandler =>
  async (file: File): Promise<void> => {
    state.webcamModeActive = false;
    stopStream();

    // Don't show the raw image yet — wait for the annotated result from backend
    resetPreview(refs);
    setStatus(refs, "Analizando imagen...", true);
    refs.resultsBox.innerHTML = "";

    try {
      const { detections, alerts, frame, image } = await uploadAndPredict(file);
      state.lastDetections = detections;

      // 📊 History
      const acc = new DetectionAccumulator("image", file.name);
      acc.addFrame(detections, alerts);
      acc.finalize();

      // Show annotated image from backend (boxes already drawn)
      // Fallback to raw file preview if backend didn't return a frame
      const resultFrame = frame ?? image;
      if (resultFrame) {
        refs.previewImg.src = `data:image/jpeg;base64,${resultFrame}`;
        refs.previewImg.classList.remove("hidden");
        refs.previewContainer.querySelector("span")?.classList.add("hidden");
      } else {
        showPreview(refs, file);
      }

      renderDetections(refs, detections);
      showAlertToasts(alerts);
      setStatus(refs, "Análisis completado", false);
    } catch (err) {
      console.error(err);
      refs.resultsBox.innerHTML = '<p class="text-red-300">No se pudo procesar la imagen.</p>';
      setStatus(refs, "Fallo al analizar", false);
    }
  };

