import type { DetectionPayload, VideoFramePayload } from "../types/domain";
import type { DetectionAccumulator } from "../services/history.service";

// ── App state interface ────────────────────────────────────────────────────

export interface AppState {
  /** True while a webcam stream is active. */
  webcamModeActive: boolean;
  /** Sorted list of received video frames used for timeline scrubbing. */
  frameTimeline: VideoFramePayload[];
  /** AbortController for the currently active SSE stream (video/webcam/youtube). */
  videoStreamAbort: AbortController | null;
  /** requestAnimationFrame ID for video overlay sync loop. */
  rafId: number | null;
  /** Last image detections — kept to redraw boxes after layout changes. */
  lastDetections: DetectionPayload[];
  /** Cached 2D canvas context for webcam rendering. */
  canvasCtx: CanvasRenderingContext2D | null;
  /** Active stream accumulator — finalised by stopStream() if user interrupts. */
  pendingAccumulator: DetectionAccumulator | null;
  /** True while multicamera dashboard is active. */
  multiCamActive: boolean;
  /** Per-camera SSE controllers for multicamera alerts. */
  multiCamControllers: Map<string, AbortController>;
}

// ── Factory ────────────────────────────────────────────────────────────────

export const createAppState = (): AppState => ({
  webcamModeActive: false,
  frameTimeline: [],
  videoStreamAbort: null,
  rafId: null,
  lastDetections: [],
  canvasCtx: null,
  pendingAccumulator: null,
  multiCamActive: false,
  multiCamControllers: new Map(),
});
