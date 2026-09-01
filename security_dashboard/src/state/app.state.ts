import type { DetectionAccumulator } from "../services/history.service";
import type { CameraCardController } from "../ui/components/camera-card";

/** Fuente única en curso. `null` cuando no hay análisis activo. */
export type ActiveSource = "image" | "video" | "youtube" | "webcam" | "camera";

export type CameraSlot = {
  controller: AbortController;
  card: CameraCardController;
};

export interface AppState {
  /** Fuente que está ocupando el escenario ahora mismo. */
  activeSource: ActiveSource | null;
  /** True mientras hay un stream en vivo (cámara o URL) que se puede detener. */
  liveMode: boolean;
  /** Stream SSE activo de la fuente única. */
  streamAbort: AbortController | null;
  /** Acumulador en curso; `stopStream()` lo cierra si el usuario interrumpe. */
  pendingAccumulator: DetectionAccumulator | null;
  /** True mientras la rejilla multicámara está en pantalla. */
  multiCamActive: boolean;
  /** Cámaras activas de la rejilla, indexadas por id. */
  cameras: Map<string, CameraSlot>;
}

export const createAppState = (): AppState => ({
  activeSource: null,
  liveMode: false,
  streamAbort: null,
  pendingAccumulator: null,
  multiCamActive: false,
  cameras: new Map(),
});
