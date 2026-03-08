// ── Detection types ────────────────────────────────────────────────────────

export type DetectionPayload = {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
};

// ── Safety alert types ─────────────────────────────────────────────────────

export type SafetyAlert = {
  /** Etiqueta legible generada por el backend (ej. "Arma Blanca Detectada"). */
  type: string;
  confidence: number;
  bbox: [number, number, number, number];
  /** Nombre de clase COCO en minúsculas (ej. "knife", "backpack"). */
  class: string;
};

// ── Stream payload types ───────────────────────────────────────────────────

export type VideoFramePayload = {
  t?: number;
  detections: DetectionPayload[] | number;
  alerts?: SafetyAlert[];
  frame?: string; // base64-encoded JPEG
  done?: boolean;
};

export type WebcamFramePayload = VideoFramePayload;

// ── History types ──────────────────────────────────────────────────────────

export type HistorySource = "image" | "video" | "webcam" | "youtube";

export type ClassCount = {
  class: string;
  count: number;
  maxConfidence: number;
};

export type HistoryEntry = {
  id: string;
  timestamp: Date;
  source: HistorySource;
  /** File name, URL fragment, or "Cámara en vivo". */
  label: string;
  classCounts: ClassCount[];
  alerts: SafetyAlert[];
  /** Number of frames analysed (undefined for single images). */
  frameCount?: number;
};

// ── Payload helpers ────────────────────────────────────────────────────────

/** Returns detection count regardless of whether backend sent array or integer. */
export const getDetectionCount = (d: DetectionPayload[] | number): number =>
  typeof d === "number" ? d : d.length;

/** Returns detection array (empty array if backend only sent count). */
export const getDetectionArray = (d: DetectionPayload[] | number): DetectionPayload[] =>
  Array.isArray(d) ? d : [];
