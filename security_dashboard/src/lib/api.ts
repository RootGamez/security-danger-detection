import { API_URL } from "./config";
import type { DetectionPayload } from "./types";

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
