export type DetectionPayload = {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
};
