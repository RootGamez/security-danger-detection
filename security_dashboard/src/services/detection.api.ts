/**
 * Detection API service.
 * All network communication with the vision backend lives here.
 * Functions are pure: they receive inputs and return results/controllers.
 */

import {
  API_URL,
  CAMERA_ADD_URL,
  CAMERA_EVENTS_URL,
  CAMERA_STREAM_URL,
  VIDEO_API_URL,
  WEBCAM_API_URL,
  YOUTUBE_API_URL,
} from "../config/env";
import type {
  CameraEventPayload,
  DetectionPayload,
  SafetyAlert,
  VideoFramePayload,
  WebcamFramePayload,
} from "../types/domain";

// ── SSE stream reader helper ───────────────────────────────────────────────

async function readSseStream<T>(
  response: Response,
  onEvent: (payload: T) => void,
  onDone: () => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    let done = false;
    let value: Uint8Array | undefined;
    try {
      ({ done, value } = await reader.read());
    } catch {
      break;
    }
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith("data:")) continue;
      try {
        const json = JSON.parse(line.slice(5).trim());
        if (json.done) { onDone(); return; }
        onEvent(json as T);
      } catch {
        /* skip malformed SSE events */
      }
    }
  }
  onDone();
}

// ── Image prediction ───────────────────────────────────────────────────────

export type ImagePredictionResult = {
  detections: DetectionPayload[];
  alerts: SafetyAlert[];
  frame?: string; // base64 JPEG with bounding boxes drawn by backend
  image?: string; // legacy key
};

export const uploadAndPredict = async (file: File): Promise<ImagePredictionResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(API_URL, { method: "POST", body: formData });

  if (!response.ok) {
    throw new Error(`Error del servidor (${response.status})`);
  }

  const data: {
    detections: DetectionPayload[];
    alerts?: SafetyAlert[];
    frame?: string;
    image?: string;
  } = await response.json();
  return {
    detections: data.detections ?? [],
    alerts: data.alerts ?? [],
    frame: data.frame,
    image: data.image,
  };
};

// ── Video stream ───────────────────────────────────────────────────────────

export const streamVideoDetections = (
  file: File,
  onFrame: (frame: VideoFramePayload) => void,
  onDone: () => void,
  onError: (err: Error) => void
): AbortController => {
  const controller = new AbortController();

  (async () => {
    const formData = new FormData();
    formData.append("file", file);

    let response: Response;
    try {
      response = await fetch(VIDEO_API_URL, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") onError(e as Error);
      return;
    }

    if (!response.ok) { onError(new Error(`Error del servidor (${response.status})`)); return; }

    try {
      await readSseStream<VideoFramePayload>(response, onFrame, onDone);
    } catch (e) {
      onError(e as Error);
    }
  })();

  return controller;
};

// ── YouTube stream ─────────────────────────────────────────────────────────

export const streamYoutubeDetections = (
  url: string,
  onFrame: (frame: VideoFramePayload) => void,
  onDone: () => void,
  onError: (err: Error) => void
): AbortController => {
  const controller = new AbortController();

  (async () => {
    let response: Response;
    try {
      response = await fetch(YOUTUBE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") onError(e as Error);
      return;
    }

    if (!response.ok) {
      const detail = await response.json().catch(() => ({ detail: response.statusText }));
      onError(new Error(detail.detail ?? `Error ${response.status}`));
      return;
    }

    try {
      await readSseStream<VideoFramePayload>(response, onFrame, onDone);
    } catch (e) {
      onError(e as Error);
    }
  })();

  return controller;
};

// ── Webcam stream ──────────────────────────────────────────────────────────

export interface WebcamStreamOptions {
  cameraSource?: string;
}

export const streamWebcamDetections = (
  onFrame: (frame: WebcamFramePayload) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  options?: WebcamStreamOptions
): AbortController => {
  const controller = new AbortController();

  (async () => {
    const params = new URLSearchParams();
    if (options?.cameraSource) params.set("camera_source", options.cameraSource);

    let response: Response;
    try {
      const url = params.toString() ? `${WEBCAM_API_URL}?${params.toString()}` : WEBCAM_API_URL;
      response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") onError(e as Error);
      return;
    }

    if (!response.ok) {
      const detail = await response.json().catch(() => ({ detail: response.statusText }));
      onError(new Error(detail.detail ?? `Error ${response.status}`));
      return;
    }

    try {
      await readSseStream<WebcamFramePayload>(response, onFrame, onDone);
    } catch (e) {
      onError(e as Error);
    }
  })();

  return controller;
};

// ── Multicam management ───────────────────────────────────────────────────

export const addCameraSource = async (camId: string, source: string): Promise<void> => {
  const response = await fetch(CAMERA_ADD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cam_id: camId, source }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(detail.detail ?? `Error ${response.status}`);
  }
};

export const cameraStreamUrl = (camId: string): string => CAMERA_STREAM_URL(camId);

export const streamCameraEvents = (
  camId: string,
  onEvent: (payload: CameraEventPayload) => void,
  onDone: () => void,
  onError: (err: Error) => void
): AbortController => {
  const controller = new AbortController();

  (async () => {
    let response: Response;
    try {
      response = await fetch(CAMERA_EVENTS_URL(camId), {
        method: "GET",
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") onError(e as Error);
      return;
    }

    if (!response.ok) {
      const detail = await response.json().catch(() => ({ detail: response.statusText }));
      onError(new Error(detail.detail ?? `Error ${response.status}`));
      return;
    }

    try {
      await readSseStream<CameraEventPayload>(response, onEvent, onDone);
    } catch (e) {
      onError(e as Error);
    }
  })();

  return controller;
};
