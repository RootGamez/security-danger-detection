/**
 * App orchestrator.
 *
 * Responsibilities:
 *  - Mount the UI shell and obtain typed DOM refs.
 *  - Initialise shared application state.
 *  - Define the shared `stopStream` cleanup routine.
 *  - Instantiate feature handlers.
 *  - Wire all DOM event listeners.
 *
 * This file intentionally contains no business or rendering logic —
 * it only coordinates the pieces defined in features/ and ui/.
 */

import { createAppState } from "./state/app.state";
import { mountApp } from "./ui/refs";
import { setStatus } from "./ui/components/status";
import { drawOverlayBoxes } from "./ui/components/overlay";
import { showLiveBadge } from "./ui/components/live-badge";
import { webcamBtnLabelStart } from "./ui/utils/icons";

import { createImageHandler } from "./features/image.feature";
import { createVideoHandler } from "./features/video.feature";
import { createWebcamHandler } from "./features/webcam.feature";
import { createYoutubeHandler } from "./features/youtube.feature";

// ── File type detection ────────────────────────────────────────────────────

const VIDEO_EXTENSIONS = new Set([".mp4", ".avi", ".mov", ".mkv", ".webm", ".mpeg", ".mpg"]);

const isVideoFile = (file: File): boolean => {
  if (file.type.startsWith("video/")) return true;
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
};

// ── Accordion helper ───────────────────────────────────────────────────────

const wireAccordion = (toggleId: string, panelId: string): void => {
  const toggle = document.querySelector<HTMLButtonElement>(`#${toggleId}`);
  const panel = document.querySelector<HTMLDivElement>(`#${panelId}`);
  if (!toggle || !panel) return;

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    panel.style.maxHeight = expanded ? "0" : `${panel.scrollHeight}px`;
  });
};

// ── Entry point ────────────────────────────────────────────────────────────

export const initApp = (): void => {
  const container = document.querySelector<HTMLDivElement>("#app");
  if (!container) throw new Error("Root #app element not found");

  const refs = mountApp(container);
  const state = createAppState();

  // ── Shared stream cleanup ──────────────────────────────────────────────

  const stopStream = (): void => {
    state.videoStreamAbort?.abort();
    state.videoStreamAbort = null;

    if (state.rafId !== null) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }

    state.frameTimeline = [];

    if (state.webcamModeActive) {
      state.webcamModeActive = false;
      state.canvasCtx = null;
      showLiveBadge(refs.previewContainer, false);
      refs.webcamBtn.classList.remove("active");
      refs.webcamBtn.innerHTML = webcamBtnLabelStart();
    }
  };

  // ── Feature handlers ───────────────────────────────────────────────────

  const handleImage   = createImageHandler(refs, state, stopStream);
  const handleVideo   = createVideoHandler(refs, state, stopStream);
  const handleWebcam  = createWebcamHandler(refs, state, stopStream);
  const handleYoutube = createYoutubeHandler(refs, state, stopStream);

  // ── Unified file dispatcher ────────────────────────────────────────────

  const handleFile = (file: File | undefined): void => {
    if (!file) return;
    if (isVideoFile(file)) {
      handleVideo(file);
    } else if (file.type.startsWith("image/")) {
      void handleImage(file);
    } else {
      setStatus(refs, "Formato no soportado", false);
    }
  };

  // ── File input / drag-and-drop ─────────────────────────────────────────

  refs.browseBtn.addEventListener("click", () => refs.fileInput.click());

  refs.fileInput.addEventListener("change", (e) => {
    handleFile((e.target as HTMLInputElement).files?.[0]);
  });

  refs.dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    refs.dropArea.classList.add("drag-over");
  });

  ["dragleave", "dragend", "drop"].forEach((evt) =>
    refs.dropArea.addEventListener(evt, () => refs.dropArea.classList.remove("drag-over"))
  );

  refs.dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer?.files?.[0]);
  });

  // Redraw overlay boxes when image finishes loading (e.g. after resize)
  refs.previewImg.addEventListener("load", () => {
    if (state.lastDetections.length) drawOverlayBoxes(refs, state.lastDetections);
  });

  // ── Webcam button ──────────────────────────────────────────────────────

  refs.webcamBtn.addEventListener("click", () => handleWebcam());

  // ── YouTube accordion ──────────────────────────────────────────────────

  wireAccordion("yt-toggle", "yt-panel");

  const ytBtn   = document.querySelector<HTMLButtonElement>("#yt-btn");
  const ytInput = document.querySelector<HTMLInputElement>("#yt-input");

  ytBtn?.addEventListener("click", () => handleYoutube(ytInput?.value ?? ""));
  ytInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleYoutube(ytInput.value);
  });

  // ── Camera URL accordion ───────────────────────────────────────────────

  wireAccordion("cam-toggle", "cam-panel");

  const camBtn   = document.querySelector<HTMLButtonElement>("#cam-btn");
  const camInput = document.querySelector<HTMLInputElement>("#cam-input");

  camBtn?.addEventListener("click", () => {
    const url = camInput?.value?.trim() ?? "";
    if (!url) { setStatus(refs, "Ingresa una URL de cámara", false); return; }
    handleWebcam(url);
  });

  camInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const url = camInput.value.trim();
      if (url) handleWebcam(url);
    }
  });

  // ── Initial status ─────────────────────────────────────────────────────

  setStatus(refs, "Esperando archivo...");
};
