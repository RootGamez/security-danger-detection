import { uploadAndPredict } from "../lib/api";
import type { DetectionPayload } from "../lib/types";
import {
  drawOverlayBoxes,
  mountApp,
  renderDetections,
  setStatus,
  showPreview
} from "../ui";

export const initApp = () => {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) {
    throw new Error("App container not found");
  }

  const refs = mountApp(app);
  let lastDetections: DetectionPayload[] = [];

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus(refs, "El archivo debe ser una imagen", false);
      return;
    }

    showPreview(refs, file);
    setStatus(refs, "Analizando imagen...", true);
    refs.resultsBox.innerHTML = "";

    try {
      const detections = await uploadAndPredict(file);
      lastDetections = detections;
      renderDetections(refs, detections);
      setStatus(refs, "Analisis completado", false);
    } catch (error) {
      console.error(error);
      refs.resultsBox.innerHTML = '<p class="text-red-300">No se pudo procesar la imagen.</p>';
      setStatus(refs, "Fallo al analizar", false);
    }
  };

  refs.browseBtn.addEventListener("click", () => refs.fileInput.click());
  refs.fileInput.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    void handleFile(file);
  });

  refs.dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    refs.dropArea.classList.add("border-accent-500");
  });

  ["dragleave", "dragend", "drop"].forEach((evt) => {
    refs.dropArea.addEventListener(evt, () => refs.dropArea.classList.remove("border-accent-500"));
  });

  refs.dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    void handleFile(file);
  });

  refs.previewImg.addEventListener("load", () => {
    if (lastDetections.length) {
      drawOverlayBoxes(refs, lastDetections);
    }
  });

  setStatus(refs, "Esperando imagen...");
};
