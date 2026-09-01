/**
 * Ejecutor común de fuentes en streaming.
 *
 * Video subido, YouTube, cámara local y cámara por URL comparten exactamente
 * el mismo ciclo: preparar el escenario, consumir fotogramas SSE, acumular
 * historial, actualizar métricas y cerrar. Antes ese ciclo estaba copiado en
 * cuatro archivos; aquí vive una sola vez y cada feature sólo aporta sus
 * textos y la llamada concreta al API.
 */

import { DetectionAccumulator } from "../services/history.service";
import type { ActiveSource } from "../state/app.state";
import {
  getDetectionArray,
  getDetectionCount,
  type HistorySource,
  type VideoFramePayload,
} from "../types/domain";
import { showAlertToasts } from "../ui/components/alert-toast";
import { showLiveBadge } from "../ui/components/live-badge";
import { useFrameTarget, paintFrame } from "../ui/components/preview";
import {
  renderDetectionCount,
  renderDetections,
  renderResultsError,
} from "../ui/components/results";
import { setStageHeader, setStatus, setStoppable } from "../ui/components/status";
import type { FeatureContext } from "./context";

/** Handlers que el ejecutor entrega al cliente del API. */
export type StreamStarter = (
  onFrame: (frame: VideoFramePayload) => void,
  onDone: () => void,
  onError: (err: Error) => void,
) => AbortController;

export type StreamConfig = {
  source: ActiveSource;
  /** Categoría con la que se guarda en el historial. */
  historySource: HistorySource;
  /** Etiqueta de la sesión en el historial. */
  label: string;
  /** Título y subtítulo del escenario. */
  title: string;
  subtitle: string;
  /** Mensaje mientras se establece la conexión. */
  connectingStatus: string;
  /** `true` en fuentes continuas (cámara/URL): muestra el distintivo En vivo. */
  live: boolean;
  /** Construye el texto de progreso a partir del recuento de fotogramas. */
  progressStatus: (frames: number, detections: number) => string;
  /** Texto final al terminar el stream con éxito. */
  doneStatus: (frames: number) => string;
  start: StreamStarter;
};

export const runStream = (ctx: FeatureContext, config: StreamConfig): void => {
  const { refs, state, stats } = ctx;

  ctx.stopStream();

  state.activeSource = config.source;
  state.liveMode = config.live;

  useFrameTarget(refs);
  stats.reset();
  setStageHeader(refs, config.title, config.subtitle);
  setStatus(refs, config.connectingStatus, true);
  setStoppable(refs, !config.live);
  showLiveBadge(refs.previewContainer, config.live);

  const accumulator = new DetectionAccumulator(config.historySource, config.label);
  state.pendingAccumulator = accumulator;

  let frames = 0;
  let finished = false;

  /** Cierra el ciclo una sola vez, venga de `done`, de error o de parada. */
  const finish = (status: string, loading = false): void => {
    if (finished) return;
    finished = true;

    accumulator.finalize();
    state.pendingAccumulator = null;
    state.activeSource = null;
    state.liveMode = false;
    state.streamAbort = null;

    stats.freeze();
    showLiveBadge(refs.previewContainer, false);
    setStoppable(refs, false);
    setStatus(refs, status, loading);
  };

  state.streamAbort = config.start(
    (frame) => {
      if (finished) return;
      frames++;

      paintFrame(refs, frame.frame);

      const detections = getDetectionArray(frame.detections);
      const count = getDetectionCount(frame.detections);

      accumulator.addFrame(detections, frame.alerts);
      stats.recordFrame(count, showAlertToasts(frame.alerts));

      // El backend manda el array completo o sólo el conteo según el endpoint.
      if (detections.length > 0) renderDetections(refs, detections);
      else renderDetectionCount(refs, count);

      setStatus(refs, config.progressStatus(frames, count), true);
    },
    () => finish(config.doneStatus(frames)),
    (err) => {
      renderResultsError(refs, err.message);
      finish(`No se pudo completar: ${err.message}`);
    },
  );
};
