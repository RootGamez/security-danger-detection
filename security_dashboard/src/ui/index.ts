import { template } from "./layout/template";
import type { UIRefs } from "./types";

export const mountApp = (app: HTMLElement): UIRefs => {
  app.innerHTML = template;

  const fileInput = document.querySelector<HTMLInputElement>("#file-input");
  const dropArea = document.querySelector<HTMLDivElement>("#drop-area");
  const browseBtn = document.querySelector<HTMLButtonElement>("#browse-btn");
  const webcamBtn = document.querySelector<HTMLButtonElement>("#webcam-btn");
  const previewImg = document.querySelector<HTMLImageElement>("#preview");
  const previewVideo = document.querySelector<HTMLVideoElement>("#preview-video");
  const webcamCanvas = document.querySelector<HTMLCanvasElement>("#webcam-canvas");
  const previewContainer = document.querySelector<HTMLDivElement>("#preview-container");
  const overlayLayer = document.querySelector<HTMLDivElement>("#box-overlay");
  const resultsBox = document.querySelector<HTMLDivElement>("#results");
  const statusText = document.querySelector<HTMLSpanElement>("#status");
  const loader = document.querySelector<HTMLDivElement>("#loader");

  if (!fileInput || !dropArea || !browseBtn || !webcamBtn || !previewImg || !previewVideo || !webcamCanvas || !previewContainer || !overlayLayer || !resultsBox || !statusText || !loader) {
    throw new Error("UI elements missing");
  }

  return {
    fileInput,
    dropArea,
    browseBtn,
    webcamBtn,
    previewImg,
    previewVideo,
    webcamCanvas,
    previewContainer,
    overlayLayer,
    resultsBox,
    statusText,
    loader
  };
};

export { setStatus } from "./components/status";
export { showPreview, showVideoPreview } from "./components/preview";
export { drawOverlayBoxes, drawOverlayBoxesOnVideo, drawOverlayBoxesOnCanvas } from "./components/overlay";
export { renderDetections } from "./components/results";
