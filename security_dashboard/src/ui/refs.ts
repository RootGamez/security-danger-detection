/**
 * Montaje del shell y referencias tipadas al DOM.
 *
 * `mountApp()` inyecta la plantilla completa una sola vez y devuelve un
 * snapshot tipado de todos los nodos interactivos. A partir de ahí ningún
 * módulo vuelve a consultar el documento por selector.
 */

import { modalsTemplate } from "./layout/modals.template";
import { railTemplate } from "./layout/rail.template";
import { sidebarTemplate } from "./layout/sidebar.template";
import { stageTemplate } from "./layout/stage.template";
import { topbarTemplate } from "./layout/topbar.template";

export type UIRefs = {
  // Barra superior
  backendPill: HTMLButtonElement;
  backendDot: HTMLSpanElement;
  backendUrlLabel: HTMLSpanElement;
  backendMeta: HTMLSpanElement;
  confSlider: HTMLInputElement;
  confValue: HTMLOutputElement;
  historyBtn: HTMLButtonElement;

  // Fuentes
  sourceTabs: HTMLButtonElement[];
  sourcePanels: HTMLElement[];
  fileInput: HTMLInputElement;
  dropArea: HTMLDivElement;
  browseBtn: HTMLButtonElement;
  fileMeta: HTMLParagraphElement;
  webcamSourceInput: HTMLInputElement;
  webcamBtn: HTMLButtonElement;
  youtubeInput: HTMLInputElement;
  youtubeBtn: HTMLButtonElement;
  urlInput: HTMLInputElement;
  urlBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;

  // Multicámara
  multiCamOpenBtn: HTMLButtonElement;
  multiCamStopBtn: HTMLButtonElement;
  multiCamList: HTMLDivElement;
  multiCamCount: HTMLSpanElement;
  multiCamGrid: HTMLDivElement;

  // Escenario
  stageTitle: HTMLHeadingElement;
  stageSubtitle: HTMLParagraphElement;
  statFps: HTMLSpanElement;
  statFrames: HTMLSpanElement;
  statDetections: HTMLSpanElement;
  statAlerts: HTMLSpanElement;
  previewContainer: HTMLDivElement;
  previewPlaceholder: HTMLDivElement;
  previewImg: HTMLImageElement;
  previewVideo: HTMLVideoElement;
  webcamCanvas: HTMLCanvasElement;
  overlayLayer: HTMLDivElement;

  // Carril de resultados
  resultsBox: HTMLDivElement;
  resultsCount: HTMLSpanElement;

  // Estado
  statusText: HTMLSpanElement;
  loader: HTMLSpanElement;

  // Modal de backend
  backendModal: HTMLDivElement;
  backendCloseBtn: HTMLButtonElement;
  backendInput: HTMLInputElement;
  backendSaveBtn: HTMLButtonElement;
  backendTestBtn: HTMLButtonElement;
  backendResetBtn: HTMLButtonElement;
  backendFeedback: HTMLParagraphElement;
  backendOrigin: HTMLElement;
  backendEnvUrl: HTMLElement;
  backendDevice: HTMLElement;

  // Modal multicámara
  multiCamModal: HTMLDivElement;
  multiCamCloseBtn: HTMLButtonElement;
  multiCamYoutubeInput: HTMLInputElement;
  multiCamYoutubeAddBtn: HTMLButtonElement;
  multiCamUrlInput: HTMLInputElement;
  multiCamUrlAddBtn: HTMLButtonElement;
  multiCamFileInput: HTMLInputElement;
  multiCamFileBrowseBtn: HTMLButtonElement;
  multiCamFileAddBtn: HTMLButtonElement;
  multiCamFileName: HTMLSpanElement;
};

/** Consulta obligatoria: falla ruidosamente si la plantilla y los refs divergen. */
const q = <T extends Element>(root: ParentNode, selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Elemento de UI no encontrado: "${selector}"`);
  return element;
};

const qAll = <T extends Element>(root: ParentNode, selector: string): T[] =>
  Array.from(root.querySelectorAll<T>(selector));

export const mountApp = (container: HTMLElement): UIRefs => {
  container.innerHTML = `
    ${topbarTemplate}
    <div class="app-shell">
      ${sidebarTemplate}
      ${stageTemplate}
      ${railTemplate}
    </div>
    ${modalsTemplate}
  `;

  const root = container;

  return {
    backendPill: q(root, "#backend-pill"),
    backendDot: q(root, "#backend-dot"),
    backendUrlLabel: q(root, "#backend-url-label"),
    backendMeta: q(root, "#backend-meta"),
    confSlider: q(root, "#conf-slider"),
    confValue: q(root, "#conf-value"),
    historyBtn: q(root, "#history-btn"),

    sourceTabs: qAll(root, "[data-source-tab]"),
    sourcePanels: qAll(root, "[data-source-panel]"),
    fileInput: q(root, "#file-input"),
    dropArea: q(root, "#drop-area"),
    browseBtn: q(root, "#browse-btn"),
    fileMeta: q(root, "#file-meta"),
    webcamSourceInput: q(root, "#webcam-source-input"),
    webcamBtn: q(root, "#webcam-btn"),
    youtubeInput: q(root, "#youtube-input"),
    youtubeBtn: q(root, "#youtube-btn"),
    urlInput: q(root, "#url-input"),
    urlBtn: q(root, "#url-btn"),
    stopBtn: q(root, "#stop-btn"),

    multiCamOpenBtn: q(root, "#multi-cam-open"),
    multiCamStopBtn: q(root, "#multi-cam-stop"),
    multiCamList: q(root, "#multi-cam-list"),
    multiCamCount: q(root, "#multi-cam-count"),
    multiCamGrid: q(root, "#multi-cam-grid"),

    stageTitle: q(root, "#stage-title"),
    stageSubtitle: q(root, "#stage-subtitle"),
    statFps: q(root, "#stat-fps"),
    statFrames: q(root, "#stat-frames"),
    statDetections: q(root, "#stat-detections"),
    statAlerts: q(root, "#stat-alerts"),
    previewContainer: q(root, "#preview-container"),
    previewPlaceholder: q(root, "#preview-placeholder"),
    previewImg: q(root, "#preview"),
    previewVideo: q(root, "#preview-video"),
    webcamCanvas: q(root, "#webcam-canvas"),
    overlayLayer: q(root, "#box-overlay"),

    resultsBox: q(root, "#results"),
    resultsCount: q(root, "#results-count"),

    statusText: q(root, "#status"),
    loader: q(root, "#loader"),

    backendModal: q(root, "#backend-modal"),
    backendCloseBtn: q(root, "#backend-close"),
    backendInput: q(root, "#backend-input"),
    backendSaveBtn: q(root, "#backend-save"),
    backendTestBtn: q(root, "#backend-test"),
    backendResetBtn: q(root, "#backend-reset"),
    backendFeedback: q(root, "#backend-feedback"),
    backendOrigin: q(root, "#backend-origin"),
    backendEnvUrl: q(root, "#backend-env-url"),
    backendDevice: q(root, "#backend-device"),

    multiCamModal: q(root, "#multi-cam-modal"),
    multiCamCloseBtn: q(root, "#multi-cam-close"),
    multiCamYoutubeInput: q(root, "#multi-yt-input"),
    multiCamYoutubeAddBtn: q(root, "#multi-yt-add"),
    multiCamUrlInput: q(root, "#multi-url-input"),
    multiCamUrlAddBtn: q(root, "#multi-url-add"),
    multiCamFileInput: q(root, "#multi-file-input"),
    multiCamFileBrowseBtn: q(root, "#multi-file-browse"),
    multiCamFileAddBtn: q(root, "#multi-file-add"),
    multiCamFileName: q(root, "#multi-file-name"),
  };
};
