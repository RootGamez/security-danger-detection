export type DetectionPayload = {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
};

export type VideoFramePayload = {
  t: number;
  detections: DetectionPayload[];
};

export type WebcamFramePayload = VideoFramePayload & {
  frame?: string;
};
