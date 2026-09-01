/**
 * Tarjeta de cámara del panel multicámara.
 *
 * Cada fuente añadida produce dos nodos emparejados: la tarjeta con vídeo en
 * la rejilla y la fila resumen en el lateral. Este módulo los crea y expone
 * un pequeño controlador para actualizarlos sin volver a consultar el DOM.
 */

import { escapeHtml, truncateMiddle } from "../utils/format";
import { icon, type IconName } from "../utils/icons";

export type CameraState = "connecting" | "live" | "done" | "error";

const STATE_LABEL: Record<CameraState, string> = {
  connecting: "Conectando…",
  live: "En vivo",
  done: "Finalizada",
  error: "Error",
};

export type CameraCardOptions = {
  camId: string;
  title: string;
  /** Descripción legible del origen (URL, nombre de archivo…). */
  source: string;
  iconName: IconName;
  /** Callback del botón de cerrar de la tarjeta. */
  onRemove: () => void;
};

export type CameraCardController = {
  readonly camId: string;
  readonly title: string;
  /** Nodo para la rejilla del escenario. Insértalo tú. */
  readonly card: HTMLElement;
  /** Nodo resumen para la lista del lateral. Insértalo tú. */
  readonly listItem: HTMLElement;
  setState: (state: CameraState, detail?: string) => void;
  /** Pinta un fotograma JPEG en base64 llegado por SSE. */
  setFrame: (base64?: string) => void;
  /** Apunta el `<img>` a un stream MJPEG servido por el backend. */
  setStreamUrl: (url: string) => void;
  /** Quita ambos nodos del documento. */
  destroy: () => void;
};

export const createCameraCard = (options: CameraCardOptions): CameraCardController => {
  const { camId, title, source, iconName, onRemove } = options;
  const safeTitle = escapeHtml(title);
  const safeSource = escapeHtml(truncateMiddle(source, 42));

  // ── Tarjeta de la rejilla ────────────────────────────────────────────────

  const card = document.createElement("article");
  card.className = "cam-card";
  card.dataset.camId = camId;
  card.innerHTML = `
    <header class="cam-card-head">
      <span class="cam-card-icon" aria-hidden="true">${icon(iconName, { size: 14 })}</span>
      <div class="cam-card-meta">
        <p class="cam-card-title">${safeTitle}</p>
        <p class="cam-card-source" title="${escapeHtml(source)}">${safeSource}</p>
      </div>
      <span class="cam-state" data-state="connecting">${STATE_LABEL.connecting}</span>
      <button class="icon-btn icon-btn-sm cam-remove" type="button"
              aria-label="Quitar ${safeTitle}">${icon("close", { size: 13 })}</button>
    </header>
    <div class="cam-feed">
      <img class="cam-stream" alt="Fotograma de ${safeTitle}" />
      <span class="cam-feed-placeholder">${icon("camera", { size: 22 })}</span>
    </div>`;

  // ── Fila del lateral ─────────────────────────────────────────────────────

  const listItem = document.createElement("div");
  listItem.className = "cam-row";
  listItem.dataset.camId = camId;
  listItem.setAttribute("role", "listitem");
  listItem.innerHTML = `
    <span class="cam-row-icon" aria-hidden="true">${icon(iconName, { size: 14 })}</span>
    <div class="cam-row-meta">
      <p class="cam-row-title">${safeTitle}</p>
      <p class="cam-row-source" title="${escapeHtml(source)}">${safeSource}</p>
    </div>
    <span class="cam-state cam-state-sm" data-state="connecting">${STATE_LABEL.connecting}</span>`;

  const stateNodes = [
    card.querySelector<HTMLElement>(".cam-state")!,
    listItem.querySelector<HTMLElement>(".cam-state")!,
  ];
  const image = card.querySelector<HTMLImageElement>(".cam-stream")!;
  const placeholder = card.querySelector<HTMLElement>(".cam-feed-placeholder")!;

  card.querySelector(".cam-remove")?.addEventListener("click", onRemove);

  const revealImage = (): void => {
    placeholder.classList.add("hidden");
    image.classList.add("is-visible");
  };

  return {
    camId,
    title,
    card,
    listItem,

    setState(state, detail) {
      stateNodes.forEach((node) => {
        node.dataset.state = state;
        node.textContent = detail ?? STATE_LABEL[state];
        if (detail) node.title = detail;
      });
      card.dataset.state = state;
    },

    setFrame(base64) {
      if (!base64) return;
      image.src = `data:image/jpeg;base64,${base64}`;
      revealImage();
    },

    setStreamUrl(url) {
      image.src = url;
      revealImage();
    },

    destroy() {
      image.removeAttribute("src"); // corta el MJPEG en curso
      card.remove();
      listItem.remove();
    },
  };
};
