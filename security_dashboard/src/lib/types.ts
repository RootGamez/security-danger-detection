export type DetectionPayload = {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
};

export type VideoFramePayload = {
  t?: number;
  detections: DetectionPayload[] | number;
  frame?: string;
  done?: boolean;
};

export type WebcamFramePayload = VideoFramePayload;

/** Helper: get detection count regardless of format */
export const getDetectionCount = (d: DetectionPayload[] | number): number =>
  typeof d === "number" ? d : d.length;

/** Helper: get detection array (empty if backend sends count) */
export const getDetectionArray = (d: DetectionPayload[] | number): DetectionPayload[] =>
  Array.isArray(d) ? d : [];
