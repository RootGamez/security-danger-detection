/**
 * Orquestador de la aplicación.
 *
 * Sólo coordina: monta el shell, crea el estado, instancia las features y
 * cablea los eventos del DOM. Ninguna lógica de negocio ni de pintado vive
 * aquí — eso está en `features/` y `ui/`.
 */

import { classifyFile, formatLabel, humanSize } from "./config/media";
import { createAppState } from "./state/app.state";
import { createImageHandler } from "./features/image.feature";
import { createMultiCamHandler } from "./features/multicam.feature";
import {
  createCameraHandler,
  createVideoHandler,
  createYoutubeHandler,
} from "./features/sources.feature";
import type { FeatureContext } from "./features/context";
import { initBackendPanel } from "./ui/components/backend-panel";
import { initConfidenceControl } from "./ui/components/confidence-control";
import { initHistoryPanel, openHistoryPanel } from "./ui/components/history-panel";
import { showLiveBadge } from "./ui/components/live-badge";
import { createModal } from "./ui/components/modal";
import { clearPreview } from "./ui/components/preview";
import { resetResults } from "./ui/components/results";
import { initSourceTabs } from "./ui/components/source-tabs";
import { setStageHeader, setStatus, setStoppable } from "./ui/components/status";
import { StatsTracker } from "./ui/components/stats";
import { mountApp } from "./ui/refs";
import { truncateMiddle } from "./ui/utils/format";
import { icon } from "./ui/utils/icons";

const IDLE_TITLE = "Sin fuente activa";
const IDLE_SUBTITLE = "Elige un archivo, una cámara o una URL para empezar a analizar.";

/** Etiqueta del botón de cámara según esté parada o corriendo. */
const cameraButtonLabel = (running: boolean): string =>
  running
    ? `${icon("camera-off")}<span>Detener cámara</span>`
    : `${icon("camera")}<span>Iniciar cámara</span>`;

export const initApp = (): void => {
  const container = document.querySelector<HTMLDivElement>("#app");
  if (!container) throw new Error("No se encontró el elemento raíz #app");

  const refs = mountApp(container);
  const state = createAppState();
  const stats = new StatsTracker(refs);

  // ── Parada compartida ──────────────────────────────────────────────────

  /**
   * Cancela el stream en curso, cierra el acumulador pendiente y devuelve el
   * escenario a su estado neutro. La invocan tanto el botón "Detener" como
   * cualquier feature antes de tomar el escenario.
   */
  const stopStream = (): void => {
    state.pendingAccumulator?.finalize();
    state.pendingAccumulator = null;

    state.streamAbort?.abort();
    state.streamAbort = null;

    state.activeSource = null;
    state.liveMode = false;

    showLiveBadge(refs.previewContainer, false);
    setStoppable(refs, false);
    stats.freeze();
    syncCameraButton();
  };

  const ctx: FeatureContext = { refs, state, stats, stopStream };

  // ── Features ───────────────────────────────────────────────────────────

  const handleImage = createImageHandler(ctx);
  const handleVideo = createVideoHandler(ctx);
  const handleYoutube = createYoutubeHandler(ctx);
  const handleCamera = createCameraHandler(ctx);
  const multiCam = createMultiCamHandler(ctx);

  // ── Componentes con estado propio ──────────────────────────────────────

  initHistoryPanel();
  initSourceTabs(refs);
  initConfidenceControl(refs);
  const backend = initBackendPanel(refs);

  const multiCamModal = createModal(refs.multiCamModal, { initialFocus: "#multi-yt-input" });

  // ── Dispatcher de archivos ─────────────────────────────────────────────

  /** Enruta el archivo a la feature de imagen o de video según su tipo. */
  const handleFile = (file: File | undefined): void => {
    if (!file) return;

    refs.fileMeta.textContent = `${truncateMiddle(file.name, 30)} · ${formatLabel(file)} · ${humanSize(file.size)}`;

    switch (classifyFile(file)) {
      case "video":
        handleVideo(file);
        break;
      case "image":
        void handleImage(file);
        break;
      default:
        setStatus(refs, `Formato no reconocido: ${file.name}`, false);
    }
  };

  // ── Entrada por archivo ────────────────────────────────────────────────

  refs.browseBtn.addEventListener("click", () => refs.fileInput.click());
  refs.dropArea.addEventListener("click", () => refs.fileInput.click());
  refs.dropArea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      refs.fileInput.click();
    }
  });

  refs.fileInput.addEventListener("change", (event) => {
    handleFile((event.target as HTMLInputElement).files?.[0]);
  });

  refs.dropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    refs.dropArea.classList.add("is-dragging");
  });

  ["dragleave", "dragend", "drop"].forEach((eventName) =>
    refs.dropArea.addEventListener(eventName, () => refs.dropArea.classList.remove("is-dragging")),
  );

  refs.dropArea.addEventListener("drop", (event) => {
    event.preventDefault();
    handleFile(event.dataTransfer?.files?.[0]);
  });

  // ── Cámara ─────────────────────────────────────────────────────────────

  function syncCameraButton(): void {
    refs.webcamBtn.innerHTML = cameraButtonLabel(state.liveMode);
    refs.webcamBtn.classList.toggle("is-active", state.liveMode);
  }

  refs.webcamBtn.addEventListener("click", () => {
    handleCamera(refs.webcamSourceInput.value);
    syncCameraButton();
  });

  // ── YouTube y URL ──────────────────────────────────────────────────────

  const submitYoutube = (): void => {
    if (!handleYoutube(refs.youtubeInput.value)) {
      setStatus(refs, "Escribe una URL de YouTube", false);
      refs.youtubeInput.focus();
    }
  };

  const submitUrl = (): void => {
    const source = refs.urlInput.value.trim();
    if (!source) {
      setStatus(refs, "Escribe la URL del stream", false);
      refs.urlInput.focus();
      return;
    }
    handleCamera(source);
    syncCameraButton();
  };

  /** Enter en un campo equivale a pulsar su botón. */
  const submitOnEnter = (input: HTMLInputElement, action: () => void): void => {
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      action();
    });
  };

  refs.youtubeBtn.addEventListener("click", submitYoutube);
  submitOnEnter(refs.youtubeInput, submitYoutube);

  refs.urlBtn.addEventListener("click", submitUrl);
  submitOnEnter(refs.urlInput, submitUrl);
  submitOnEnter(refs.webcamSourceInput, () => refs.webcamBtn.click());

  // ── Parada global ──────────────────────────────────────────────────────

  refs.stopBtn.addEventListener("click", () => {
    stopStream();
    setStatus(refs, "Análisis detenido", false);
  });

  // ── Historial ──────────────────────────────────────────────────────────

  refs.historyBtn.addEventListener("click", () => openHistoryPanel());

  // ── Multicámara ────────────────────────────────────────────────────────

  refs.multiCamOpenBtn.addEventListener("click", () => multiCamModal.open());
  refs.multiCamCloseBtn.addEventListener("click", () => multiCamModal.close());
  refs.multiCamStopBtn.addEventListener("click", () => multiCam.stopAll());

  /** Añade una fuente desde el modal y lo cierra si el valor era válido. */
  const addFromInput = (input: HTMLInputElement, add: (value: string) => void): void => {
    const value = input.value.trim();
    if (!value) {
      input.focus();
      return;
    }
    add(value);
    input.value = "";
    multiCamModal.close();
  };

  refs.multiCamYoutubeAddBtn.addEventListener("click", () =>
    addFromInput(refs.multiCamYoutubeInput, multiCam.addFromYoutube),
  );
  submitOnEnter(refs.multiCamYoutubeInput, () =>
    addFromInput(refs.multiCamYoutubeInput, multiCam.addFromYoutube),
  );

  refs.multiCamUrlAddBtn.addEventListener("click", () =>
    addFromInput(refs.multiCamUrlInput, multiCam.addFromUrl),
  );
  submitOnEnter(refs.multiCamUrlInput, () =>
    addFromInput(refs.multiCamUrlInput, multiCam.addFromUrl),
  );

  refs.multiCamFileBrowseBtn.addEventListener("click", () => refs.multiCamFileInput.click());

  refs.multiCamFileInput.addEventListener("change", () => {
    const file = refs.multiCamFileInput.files?.[0];
    refs.multiCamFileName.textContent = file ? truncateMiddle(file.name, 24) : "Sin archivo";
  });

  refs.multiCamFileAddBtn.addEventListener("click", () => {
    const file = refs.multiCamFileInput.files?.[0];
    if (!file) {
      setStatus(refs, "Selecciona un archivo primero", false);
      refs.multiCamFileInput.click();
      return;
    }
    multiCam.addFromFile(file);
    refs.multiCamFileInput.value = "";
    refs.multiCamFileName.textContent = "Sin archivo";
    multiCamModal.close();
  });

  // ── Estado inicial ─────────────────────────────────────────────────────

  clearPreview(refs);
  resetResults(refs);
  setStageHeader(refs, IDLE_TITLE, IDLE_SUBTITLE);
  setStatus(refs, "Esperando una fuente…");
  syncCameraButton();

  void backend.refresh();
};
