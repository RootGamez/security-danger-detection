// ── Detection types ────────────────────────────────────────────────────────

export type DetectionPayload = {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
};

export type VideoFramePayload = {
  t?: number;
  detections: DetectionPayload[] | number;
  frame?: string; // base64-encoded JPEG
  done?: boolean;
};

export type WebcamFramePayload = VideoFramePayload;

// ── Payload helpers ────────────────────────────────────────────────────────

/** Returns detection count regardless of whether backend sent array or integer. */
export const getDetectionCount = (d: DetectionPayload[] | number): number =>
  typeof d === "number" ? d : d.length;

/** Returns detection array (empty array if backend only sent count). */
export const getDetectionArray = (d: DetectionPayload[] | number): DetectionPayload[] =>
  Array.isArray(d) ? d : [];
