import { API_URL, VIDEO_API_URL } from "./config";
import type { DetectionPayload, VideoFramePayload } from "./types";

export const uploadAndPredict = async (file: File): Promise<DetectionPayload[]> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(API_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Error del servidor (${response.status})`);
  }

  const data: { detections: DetectionPayload[] } = await response.json();
  return data.detections ?? [];
};

/**
 * Upload a video and stream per-frame detections via SSE.
 * Calls `onFrame` for each received frame payload.
 * Calls `onDone` when the stream ends.
 * Returns an AbortController so the caller can cancel early.
 */
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

    if (!response.ok) {
      onError(new Error(`Error del servidor (${response.status})`));
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { onError(new Error("No response body")); return; }

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

      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const chunk of lines) {
        const line = chunk.trim();
        if (!line.startsWith("data:")) continue;
        try {
          const json = JSON.parse(line.slice(5).trim());
          if (json.done) { onDone(); return; }
          onFrame(json as VideoFramePayload);
        } catch { /* skip malformed */ }
      }
    }
    onDone();
  })();

  return controller;
};
