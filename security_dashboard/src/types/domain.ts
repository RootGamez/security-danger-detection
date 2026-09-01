// ── Detecciones ────────────────────────────────────────────────────────────

export type BoundingBox = [number, number, number, number]; // [x1, y1, x2, y2]

export type DetectionPayload = {
  class: string;
  confidence: number;
  bbox: BoundingBox;
};

// ── Alertas de seguridad ───────────────────────────────────────────────────

export type SafetyAlert = {
  /** Etiqueta legible generada por el backend (ej. "Arma Blanca Detectada"). */
  type: string;
  confidence: number;
  bbox: BoundingBox;
  /** Nombre de clase del modelo en minúsculas (ej. "knife", "backpack"). */
  class: string;
  /** Etiqueta de la cámara cuando la alerta viene del panel multicámara. */
  cameraId?: string;
};

// ── Payloads de stream ─────────────────────────────────────────────────────

export type VideoFramePayload = {
  t?: number;
  /** El backend envía el array completo o sólo el conteo, según el endpoint. */
  detections: DetectionPayload[] | number;
  alerts?: SafetyAlert[];
  /** JPEG en base64 con las cajas ya dibujadas. */
  frame?: string;
  done?: boolean;
};

export type WebcamFramePayload = VideoFramePayload;

export type CameraEventPayload = {
  cam_id: string;
  detections: DetectionPayload[];
  alerts?: SafetyAlert[];
  ts?: number;
};

// ── Historial ──────────────────────────────────────────────────────────────

export type HistorySource = "image" | "video" | "webcam" | "youtube" | "camera";

export type ClassCount = {
  class: string;
  count: number;
  maxConfidence: number;
};

export type HistoryEntry = {
  id: string;
  timestamp: Date;
  source: HistorySource;
  /** Nombre de archivo, fragmento de URL o "Cámara en vivo". */
  label: string;
  classCounts: ClassCount[];
  alerts: SafetyAlert[];
  /** Fotogramas analizados (ausente en imágenes sueltas). */
  frameCount?: number;
};

// ── Métricas de sesión (tarjetas KPI) ──────────────────────────────────────

export type SessionStats = {
  /** Fotogramas recibidos desde que arrancó la fuente actual. */
  frames: number;
  /** Detecciones del último fotograma. */
  detections: number;
  /** Alertas acumuladas en la sesión. */
  alerts: number;
  /** Fotogramas por segundo observados en el cliente. */
  fps: number;
};

export const emptyStats = (): SessionStats => ({ frames: 0, detections: 0, alerts: 0, fps: 0 });

// ── Helpers de payload ─────────────────────────────────────────────────────

/** Conteo de detecciones, venga el backend con array o con entero. */
export const getDetectionCount = (d: DetectionPayload[] | number): number =>
  typeof d === "number" ? d : d.length;

/** Array de detecciones (vacío si el backend sólo mandó el conteo). */
export const getDetectionArray = (d: DetectionPayload[] | number): DetectionPayload[] =>
  Array.isArray(d) ? d : [];
