/**
 * Fuentes en streaming de una sola vista: video subido, YouTube, cámara del
 * servidor y cámara por URL.
 *
 * Cada una se reduce a una configuración declarativa para `runStream`, que
 * es quien pone el ciclo de vida común.
 */

import { formatLabel, humanSize } from "../config/media";
import {
  streamVideoDetections,
  streamWebcamDetections,
  streamYoutubeDetections,
} from "../services/detection.api";
import { formatCount, truncateMiddle } from "../ui/utils/format";
import { runStream } from "./stream-runner";
import type { FeatureContext } from "./context";

/** Texto de progreso compartido por todas las fuentes en streaming. */
const progress = (frames: number, detections: number): string =>
  `${formatCount(frames)} fotogramas · ${detections} detecciones`;

// ── Video subido ───────────────────────────────────────────────────────────

export const createVideoHandler = (ctx: FeatureContext) => (file: File): void => {
  runStream(ctx, {
    source: "video",
    historySource: "video",
    label: file.name,
    title: truncateMiddle(file.name, 46),
    subtitle: `${formatLabel(file)} · ${humanSize(file.size)}`,
    connectingStatus: "Subiendo video y analizando…",
    live: false,
    progressStatus: progress,
    doneStatus: (frames) => `Video analizado · ${formatCount(frames)} fotogramas`,
    start: (onFrame, onDone, onError) => streamVideoDetections(file, onFrame, onDone, onError),
  });
};

// ── YouTube ────────────────────────────────────────────────────────────────

export type YoutubeHandler = (url: string) => boolean;

/**
 * @returns `false` si la URL está vacía, para que la UI pueda avisar.
 */
export const createYoutubeHandler = (ctx: FeatureContext): YoutubeHandler => (url) => {
  const normalized = url.trim();
  if (!normalized) return false;

  runStream(ctx, {
    source: "youtube",
    historySource: "youtube",
    label: normalized,
    title: "Video de YouTube",
    subtitle: truncateMiddle(normalized, 52),
    connectingStatus: "Abriendo el stream de YouTube…",
    live: false,
    progressStatus: progress,
    doneStatus: (frames) => `Video analizado · ${formatCount(frames)} fotogramas`,
    start: (onFrame, onDone, onError) =>
      streamYoutubeDetections(normalized, onFrame, onDone, onError),
  });

  return true;
};

// ── Cámara (local del backend o por URL) ───────────────────────────────────

export type CameraHandler = (cameraSource?: string) => void;

const cameraLabel = (cameraSource?: string): string =>
  cameraSource?.trim() ? cameraSource.trim() : "cámara del servidor";

/**
 * Fuente en vivo. Es *toggle*: si ya hay una cámara corriendo, la detiene.
 */
export const createCameraHandler = (ctx: FeatureContext): CameraHandler => (cameraSource) => {
  if (ctx.state.liveMode) {
    ctx.stopStream();
    return;
  }

  const source = cameraSource?.trim() || undefined;
  const label = cameraLabel(source);

  runStream(ctx, {
    source: source ? "camera" : "webcam",
    historySource: source ? "camera" : "webcam",
    label: `Cámara (${label})`,
    title: source ? "Stream por URL" : "Cámara del servidor",
    subtitle: source ? truncateMiddle(label, 52) : "Origen predeterminado del backend",
    connectingStatus: `Conectando con ${label}…`,
    live: true,
    progressStatus: (frames, detections) => `En vivo · ${progress(frames, detections)}`,
    doneStatus: (frames) => `Cámara detenida · ${formatCount(frames)} fotogramas`,
    start: (onFrame, onDone, onError) =>
      streamWebcamDetections(onFrame, onDone, onError, source ? { cameraSource: source } : undefined),
  });
};
