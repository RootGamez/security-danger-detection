/**
 * UIRefs — typed DOM references for all interactive and display elements.
 * mountApp() injects the full template into the given container
 * and returns a fully typed snapshot of DOM refs.
 */

import { sidebarTemplate } from "./layout/sidebar.template";
import { previewTemplate } from "./layout/preview.template";

// ── DOM ref bundle type ────────────────────────────────────────────────────

export type UIRefs = {
  // Inputs
  fileInput: HTMLInputElement;
  dropArea: HTMLDivElement;
  browseBtn: HTMLButtonElement;
  webcamBtn: HTMLButtonElement;
  historyBtn: HTMLButtonElement;
  multiCamOpenBtn: HTMLButtonElement;
  multiCamStopBtn: HTMLButtonElement;
  multiCamList: HTMLDivElement;
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
  // Preview
  previewImg: HTMLImageElement;
  previewVideo: HTMLVideoElement;
  webcamCanvas: HTMLCanvasElement;
  previewContainer: HTMLDivElement;
  overlayLayer: HTMLDivElement;
  multiCamGrid: HTMLDivElement;
  // Sidebar output
  resultsBox: HTMLDivElement;
  statusText: HTMLSpanElement;
  loader: HTMLDivElement;
};

// ── Internal query helper ──────────────────────────────────────────────────

const q = <T extends Element>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Required UI element not found: "${selector}"`);
  return el;
};

// ── Mount ──────────────────────────────────────────────────────────────────

/**
 * Renders the app shell into `container` and returns typed DOM refs.
 * Called once during app initialisation.
 */
export const mountApp = (container: HTMLElement): UIRefs => {
  container.innerHTML = `
    <div class="app-shell">
      ${sidebarTemplate}
      ${previewTemplate}
    </div>
  `;

  return {
    fileInput:        q<HTMLInputElement>("#file-input"),
    dropArea:         q<HTMLDivElement>("#drop-area"),
    browseBtn:        q<HTMLButtonElement>("#browse-btn"),
    webcamBtn:        q<HTMLButtonElement>("#webcam-btn"),
    historyBtn:       q<HTMLButtonElement>("#history-btn"),
    multiCamOpenBtn:  q<HTMLButtonElement>("#multi-cam-open"),
    multiCamStopBtn:  q<HTMLButtonElement>("#multi-cam-stop"),
    multiCamList:     q<HTMLDivElement>("#multi-cam-list"),
    multiCamModal:    q<HTMLDivElement>("#multi-cam-modal"),
    multiCamCloseBtn: q<HTMLButtonElement>("#multi-cam-close"),
    multiCamYoutubeInput: q<HTMLInputElement>("#multi-yt-input"),
    multiCamYoutubeAddBtn: q<HTMLButtonElement>("#multi-yt-add"),
    multiCamUrlInput: q<HTMLInputElement>("#multi-url-input"),
    multiCamUrlAddBtn: q<HTMLButtonElement>("#multi-url-add"),
    multiCamFileInput: q<HTMLInputElement>("#multi-file-input"),
    multiCamFileBrowseBtn: q<HTMLButtonElement>("#multi-file-browse"),
    multiCamFileAddBtn: q<HTMLButtonElement>("#multi-file-add"),
    multiCamFileName: q<HTMLSpanElement>("#multi-file-name"),
    previewImg:       q<HTMLImageElement>("#preview"),
    previewVideo:     q<HTMLVideoElement>("#preview-video"),
    webcamCanvas:     q<HTMLCanvasElement>("#webcam-canvas"),
    previewContainer: q<HTMLDivElement>("#preview-container"),
    overlayLayer:     q<HTMLDivElement>("#box-overlay"),
    multiCamGrid:     q<HTMLDivElement>("#multi-cam-grid"),
    resultsBox:       q<HTMLDivElement>("#results"),
    statusText:       q<HTMLSpanElement>("#status"),
    loader:           q<HTMLDivElement>("#loader"),
  };
};
