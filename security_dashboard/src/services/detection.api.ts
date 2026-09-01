/**
 * Cliente HTTP del backend de visión.
 *
 * Toda la comunicación de red vive aquí. Las funciones no tocan el DOM:
 * reciben entradas y devuelven resultados o `AbortController` para cancelar.
 * Las URLs se resuelven en cada llamada porque la URL base es cambiable en
 * caliente (ver `core/backend.store.ts`).
 */

import {
  cameraAddUrl,
  cameraEventsUrl,
  cameraStreamUrl,
  commonHeaders,
  predictImageUrl,
  predictVideoUrl,
  predictWebcamUrl,
  predictYoutubeUrl,
} from "../config/endpoints";
import { getConfidence } from "../core/settings.store";
import type {
  CameraEventPayload,
  DetectionPayload,
  SafetyAlert,
  VideoFramePayload,
  WebcamFramePayload,
} from "../types/domain";

// ── Utilidades comunes ─────────────────────────────────────────────────────

/** Añade el umbral de confianza activo como query param. */
const withConfidence = (url: string, extra?: Record<string, string>): string => {
  const params = new URLSearchParams({ conf: getConfidence().toFixed(2), ...extra });
  return `${url}?${params.toString()}`;
};

/** Extrae el mensaje de error más útil que traiga la respuesta. */
const readErrorMessage = async (response: Response): Promise<string> => {
  const payload = await response.json().catch(() => null);
  const detail =
    payload && typeof payload === "object" ? (payload as { detail?: unknown }).detail : null;
  if (typeof detail === "string" && detail.trim()) return detail;
  return `El backend respondió ${response.status} ${response.statusText}`.trim();
};

const isAbort = (err: unknown): boolean =>
  err instanceof DOMException ? err.name === "AbortError" : (err as Error)?.name === "AbortError";

const toError = (err: unknown): Error =>
  err instanceof Error
    ? err
    : new Error("No se pudo contactar con el backend. Revisa la URL configurada.");

// ── Lector de streams SSE ──────────────────────────────────────────────────

/**
 * Consume un `text/event-stream` y entrega cada evento `data:` ya parseado.
 * Un evento con `{ "done": true }` cierra el stream limpiamente.
 */
async function readSseStream<T>(
  response: Response,
  onEvent: (payload: T) => void,
  onDone: () => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("La respuesta del backend no trae cuerpo legible");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const line = chunk.trim();
        if (!line.startsWith("data:")) continue;

        let json: unknown;
        try {
          json = JSON.parse(line.slice(5).trim());
        } catch {
          continue; // evento SSE malformado: se ignora
        }

        if ((json as { done?: boolean })?.done) {
          onDone();
          return;
        }
        onEvent(json as T);
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  onDone();
}

/**
 * Envuelve el ciclo completo de un stream SSE: petición, validación de la
 * respuesta y lectura. Centraliza el manejo de errores y cancelación que
 * antes estaba duplicado en cada endpoint.
 */
const openSseStream = <T>(
  buildRequest: (signal: AbortSignal) => Promise<Response>,
  onEvent: (payload: T) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): AbortController => {
  const controller = new AbortController();

  void (async () => {
    let response: Response;
    try {
      response = await buildRequest(controller.signal);
    } catch (err) {
      if (!isAbort(err)) onError(toError(err));
      return;
    }

    if (!response.ok) {
      onError(new Error(await readErrorMessage(response)));
      return;
    }

    try {
      await readSseStream<T>(response, onEvent, onDone);
    } catch (err) {
      if (!isAbort(err)) onError(toError(err));
    }
  })();

  return controller;
};

// ── Imagen ─────────────────────────────────────────────────────────────────

export type ImagePredictionResult = {
  detections: DetectionPayload[];
  alerts: SafetyAlert[];
  /** JPEG base64 con las cajas ya dibujadas por el backend. */
  frame?: string;
};

export const uploadAndPredict = async (file: File): Promise<ImagePredictionResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(withConfidence(predictImageUrl()), {
    method: "POST",
    headers: commonHeaders(),
    body: formData,
  });

  if (!response.ok) throw new Error(await readErrorMessage(response));

  const data = (await response.json()) as {
    detections?: DetectionPayload[];
    alerts?: SafetyAlert[];
    frame?: string;
    image?: string;
  };

  return {
    detections: data.detections ?? [],
    alerts: data.alerts ?? [],
    frame: data.frame ?? data.image,
  };
};

// ── Video subido ───────────────────────────────────────────────────────────

export const streamVideoDetections = (
  file: File,
  onFrame: (frame: VideoFramePayload) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): AbortController => {
  const formData = new FormData();
  formData.append("file", file);

  return openSseStream<VideoFramePayload>(
    (signal) =>
      fetch(withConfidence(predictVideoUrl()), {
        method: "POST",
        headers: commonHeaders(),
        body: formData,
        signal,
      }),
    onFrame,
    onDone,
    onError,
  );
};

// ── YouTube ────────────────────────────────────────────────────────────────

export const streamYoutubeDetections = (
  url: string,
  onFrame: (frame: VideoFramePayload) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): AbortController =>
  openSseStream<VideoFramePayload>(
    (signal) =>
      fetch(withConfidence(predictYoutubeUrl()), {
        method: "POST",
        headers: { ...commonHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal,
      }),
    onFrame,
    onDone,
    onError,
  );

// ── Cámara en vivo (fuente única) ──────────────────────────────────────────

export type WebcamStreamOptions = {
  /** URL de cámara IP/DroidCam o índice de dispositivo. Vacío = cámara por defecto. */
  cameraSource?: string;
};

export const streamWebcamDetections = (
  onFrame: (frame: WebcamFramePayload) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  options?: WebcamStreamOptions,
): AbortController => {
  const extra = options?.cameraSource ? { camera_source: options.cameraSource } : undefined;

  return openSseStream<WebcamFramePayload>(
    (signal) =>
      fetch(withConfidence(predictWebcamUrl(), extra), {
        method: "GET",
        headers: commonHeaders(),
        signal,
      }),
    onFrame,
    onDone,
    onError,
  );
};

// ── Multicámara ────────────────────────────────────────────────────────────

export const addCameraSource = async (camId: string, source: string): Promise<void> => {
  const response = await fetch(cameraAddUrl(), {
    method: "POST",
    headers: { ...commonHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ cam_id: camId, source }),
  });

  if (!response.ok) throw new Error(await readErrorMessage(response));
};

/** URL MJPEG de una cámara ya registrada, para usar en `<img src>`. */
export const mjpegStreamUrl = (camId: string): string => cameraStreamUrl(camId);

export const streamCameraEvents = (
  camId: string,
  onEvent: (payload: CameraEventPayload) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): AbortController =>
  openSseStream<CameraEventPayload>(
    (signal) => fetch(cameraEventsUrl(camId), { method: "GET", headers: commonHeaders(), signal }),
    onEvent,
    onDone,
    onError,
  );
