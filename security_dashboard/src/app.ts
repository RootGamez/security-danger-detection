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
import { showLiveBadge } from "./ui/components/live-badge";
import { webcamBtnLabelStart } from "./ui/utils/icons";
import { initHistoryPanel, openHistoryPanel } from "./ui/components/history-panel";

import { createImageHandler } from "./features/image.feature";
import { createVideoHandler } from "./features/video.feature";
import { createWebcamHandler } from "./features/webcam.feature";
import { createMultiCamHandler } from "./features/multicam.feature";

// ── File type detection ────────────────────────────────────────────────────

const VIDEO_EXTENSIONS = new Set([".mp4", ".avi", ".mov", ".mkv", ".webm", ".mpeg", ".mpg"]);

const isVideoFile = (file: File): boolean => {
  if (file.type.startsWith("video/")) return true;
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
};

// ── Entry point ────────────────────────────────────────────────────────────

export const initApp = (): void => {
  const container = document.querySelector<HTMLDivElement>("#app");
  if (!container) throw new Error("Root #app element not found");

  const refs = mountApp(container);
  const state = createAppState();

  // Initialise the history drawer (injects DOM once)
  initHistoryPanel();

  let stopMultiCam = (): void => {};

  // ── Shared stream cleanup ──────────────────────────────────────────────

  const stopStream = (): void => {
    // Finalise any in-progress stream accumulator before aborting
    if (state.pendingAccumulator) {
      state.pendingAccumulator.finalize();
      state.pendingAccumulator = null;
    }

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

    if (state.multiCamActive) {
      stopMultiCam();
    }
  };

  // ── Feature handlers ───────────────────────────────────────────────────

  const handleImage   = createImageHandler(refs, state, stopStream);
  const handleVideo   = createVideoHandler(refs, state, stopStream);
  const handleWebcam  = createWebcamHandler(refs, state, stopStream);
  const multiCamHandlers = createMultiCamHandler(refs, state, stopStream);
  stopMultiCam = multiCamHandlers.stopAll;

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

  // ── Webcam button ──────────────────────────────────────────────────────

  refs.webcamBtn.addEventListener("click", () => handleWebcam());

  // ── History button ────────────────────────────────────────────────────

  refs.historyBtn.addEventListener("click", () => openHistoryPanel());

  // ── Multicamera modal controls ───────────────────────────────────────

  const openMultiModal = (): void => {
    refs.multiCamModal.classList.remove("hidden");
    refs.multiCamModal.setAttribute("aria-hidden", "false");
  };

  const closeMultiModal = (): void => {
    refs.multiCamModal.classList.add("hidden");
    refs.multiCamModal.setAttribute("aria-hidden", "true");
  };

  refs.multiCamOpenBtn.addEventListener("click", openMultiModal);
  refs.multiCamCloseBtn.addEventListener("click", closeMultiModal);
  refs.multiCamModal.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.dataset.close === "true") closeMultiModal();
  });

  refs.multiCamYoutubeAddBtn.addEventListener("click", () => {
    multiCamHandlers.addFromYoutube(refs.multiCamYoutubeInput.value);
    refs.multiCamYoutubeInput.value = "";
    closeMultiModal();
  });

  refs.multiCamYoutubeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      multiCamHandlers.addFromYoutube(refs.multiCamYoutubeInput.value);
      refs.multiCamYoutubeInput.value = "";
      closeMultiModal();
    }
  });

  refs.multiCamUrlAddBtn.addEventListener("click", () => {
    multiCamHandlers.addFromUrl(refs.multiCamUrlInput.value);
    refs.multiCamUrlInput.value = "";
    closeMultiModal();
  });

  refs.multiCamUrlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      multiCamHandlers.addFromUrl(refs.multiCamUrlInput.value);
      refs.multiCamUrlInput.value = "";
      closeMultiModal();
    }
  });

  refs.multiCamFileBrowseBtn.addEventListener("click", () => refs.multiCamFileInput.click());

  refs.multiCamFileInput.addEventListener("change", () => {
    const file = refs.multiCamFileInput.files?.[0];
    refs.multiCamFileName.textContent = file ? file.name : "Sin archivo";
  });

  refs.multiCamFileAddBtn.addEventListener("click", () => {
    const file = refs.multiCamFileInput.files?.[0];
    if (!file) {
      setStatus(refs, "Selecciona un archivo", false);
      return;
    }
    multiCamHandlers.addFromFile(file);
    refs.multiCamFileInput.value = "";
    refs.multiCamFileName.textContent = "Sin archivo";
    closeMultiModal();
  });

  refs.multiCamStopBtn.addEventListener("click", () => stopMultiCam());

  // ── Initial status ─────────────────────────────────────────────────────

  setStatus(refs, "Esperando archivo...");
};
