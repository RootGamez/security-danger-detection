/**
 * Detection API service.
 * All network communication with the vision backend lives here.
 * Functions are pure: they receive inputs and return results/controllers.
 */

import { API_URL, VIDEO_API_URL, WEBCAM_API_URL, YOUTUBE_API_URL } from "../config/env";
import type { DetectionPayload, SafetyAlert, VideoFramePayload, WebcamFramePayload } from "../types/domain";

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
};

export const uploadAndPredict = async (file: File): Promise<ImagePredictionResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(API_URL, { method: "POST", body: formData });

  if (!response.ok) {
    throw new Error(`Error del servidor (${response.status})`);
  }

  const data: { detections: DetectionPayload[]; alerts?: SafetyAlert[]; frame?: string } = await response.json();
  return {
    detections: data.detections ?? [],
    alerts: data.alerts ?? [],
    frame: data.frame,
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
  deviceIndex?: number;
  maxFps?: number;
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
    const params = new URLSearchParams({
      device_index: String(options?.deviceIndex ?? 0),
      max_fps: String(options?.maxFps ?? 10),
      include_frame: "true",
    });
    if (options?.cameraSource) params.set("camera_source", options.cameraSource);

    let response: Response;
    try {
      response = await fetch(`${WEBCAM_API_URL}?${params.toString()}`, {
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
