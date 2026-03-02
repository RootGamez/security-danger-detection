/**
 * Image feature — handles still image file upload and detection.
 */

import { uploadAndPredict } from "../services/detection.api";
import type { AppState } from "../state/app.state";
import type { UIRefs } from "../ui/refs";
import { showPreview, resetPreview } from "../ui/components/preview";
import { renderDetections } from "../ui/components/results";
import { setStatus } from "../ui/components/status";

export type ImageHandler = (file: File) => Promise<void>;

export const createImageHandler = (
  refs: UIRefs,
  state: AppState,
  stopStream: () => void
): ImageHandler =>
  async (file: File): Promise<void> => {
    state.webcamModeActive = false;
    stopStream();

    showPreview(refs, file);
    setStatus(refs, "Analizando imagen...", true);
    refs.resultsBox.innerHTML = "";

    try {
      const detections = await uploadAndPredict(file);
      state.lastDetections = detections;
      renderDetections(refs, detections);
      setStatus(refs, "Análisis completado", false);
    } catch (err) {
      console.error(err);
      refs.resultsBox.innerHTML = '<p class="text-red-300">No se pudo procesar la imagen.</p>';
      setStatus(refs, "Fallo al analizar", false);
    }
  };
