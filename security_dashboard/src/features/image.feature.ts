/**
 * Análisis de una imagen suelta.
 *
 * A diferencia del resto de fuentes no hay stream: una petición, una
 * respuesta con el fotograma ya anotado por el backend.
 */

import { formatLabel, humanSize } from "../config/media";
import { uploadAndPredict } from "../services/detection.api";
import { DetectionAccumulator } from "../services/history.service";
import { showAlertToasts } from "../ui/components/alert-toast";
import { paintFrame, showImagePreview, useFrameTarget } from "../ui/components/preview";
import { renderDetections, renderResultsError } from "../ui/components/results";
import { setStageHeader, setStatus, setStoppable } from "../ui/components/status";
import { truncateMiddle } from "../ui/utils/format";
import type { FeatureContext } from "./context";

export type ImageHandler = (file: File) => Promise<void>;

export const createImageHandler = (ctx: FeatureContext): ImageHandler => {
  const { refs, state, stats } = ctx;

  return async (file: File): Promise<void> => {
    ctx.stopStream();

    state.activeSource = "image";
    stats.reset();
    useFrameTarget(refs);
    setStageHeader(
      refs,
      truncateMiddle(file.name, 46),
      `${formatLabel(file)} · ${humanSize(file.size)}`,
    );
    setStatus(refs, "Analizando imagen…", true);
    setStoppable(refs, false);

    try {
      const { detections, alerts, frame } = await uploadAndPredict(file);

      const accumulator = new DetectionAccumulator("image", file.name);
      accumulator.addFrame(detections, alerts);
      accumulator.finalize();

      // El backend devuelve el JPEG con las cajas dibujadas; si no llega,
      // mostramos el archivo original para no dejar el escenario vacío.
      if (frame) paintFrame(refs, frame);
      else showImagePreview(refs, file);

      renderDetections(refs, detections);
      stats.recordFrame(detections.length, showAlertToasts(alerts));
      setStatus(refs, `Análisis completado · ${detections.length} detecciones`, false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      renderResultsError(refs, message);
      setStatus(refs, `No se pudo analizar la imagen: ${message}`, false);
    } finally {
      state.activeSource = null;
    }
  };
};
