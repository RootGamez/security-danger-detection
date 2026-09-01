/**
 * Panel lateral: selección de fuente y control multicámara.
 *
 * Las cuatro fuentes (archivo, cámara, YouTube, URL) se agrupan en pestañas
 * en lugar de apilarse: sólo una está activa a la vez, así que mostrarlas
 * todas a la vez sólo añadía ruido.
 */

import { FILE_ACCEPT } from "../../config/media";
import { icon } from "../utils/icons";

type SourceTab = {
  id: string;
  label: string;
  iconName: Parameters<typeof icon>[0];
};

const TABS: SourceTab[] = [
  { id: "file", label: "Archivo", iconName: "folder" },
  { id: "webcam", label: "Cámara", iconName: "camera" },
  { id: "youtube", label: "YouTube", iconName: "youtube" },
  { id: "url", label: "URL", iconName: "link" },
];

const tabButtons = TABS.map(
  (tab, index) => `
    <button
      class="source-tab"
      type="button"
      role="tab"
      id="source-tab-${tab.id}"
      data-source-tab="${tab.id}"
      aria-selected="${index === 0}"
      aria-controls="source-panel-${tab.id}"
      tabindex="${index === 0 ? 0 : -1}"
    >
      ${icon(tab.iconName, { size: 15 })}
      <span>${tab.label}</span>
    </button>`,
).join("");

export const sidebarTemplate = `
  <aside class="sidebar" aria-label="Fuentes de análisis">
    <section class="panel">
      <h2 class="panel-title">Fuente de análisis</h2>

      <div class="source-tabs" role="tablist" aria-label="Tipo de fuente">
        ${tabButtons}
      </div>

      <!-- Archivo -->
      <div
        class="source-panel"
        id="source-panel-file"
        role="tabpanel"
        aria-labelledby="source-tab-file"
        data-source-panel="file"
      >
        <input id="file-input" type="file" accept="${FILE_ACCEPT}" class="visually-hidden" />
        <div id="drop-area" class="drop-area" tabindex="0" role="button"
             aria-label="Zona para soltar un archivo de imagen o video">
          <span class="drop-icon" aria-hidden="true">${icon("upload", { size: 22 })}</span>
          <p class="drop-label">Arrastra un archivo aquí</p>
          <p class="drop-hint">Cualquier formato de imagen o video</p>
        </div>
        <p id="file-meta" class="field-note" role="status">Sin archivo seleccionado</p>
        <button id="browse-btn" class="btn btn-primary btn-block" type="button">
          ${icon("folder")}
          <span>Elegir archivo</span>
        </button>
      </div>

      <!-- Cámara -->
      <div
        class="source-panel hidden"
        id="source-panel-webcam"
        role="tabpanel"
        aria-labelledby="source-tab-webcam"
        data-source-panel="webcam"
      >
        <label class="field-label" for="webcam-source-input">Origen de la cámara</label>
        <input
          id="webcam-source-input"
          class="field-input"
          type="text"
          placeholder="Vacío = cámara del servidor"
          autocomplete="off"
          spellcheck="false"
        />
        <p class="field-note">
          Índice de dispositivo (<code>0</code>, <code>1</code>) o URL de cámara IP.
        </p>
        <button id="webcam-btn" class="btn btn-accent btn-block" type="button">
          ${icon("camera")}
          <span>Iniciar cámara</span>
        </button>
      </div>

      <!-- YouTube -->
      <div
        class="source-panel hidden"
        id="source-panel-youtube"
        role="tabpanel"
        aria-labelledby="source-tab-youtube"
        data-source-panel="youtube"
      >
        <label class="field-label" for="youtube-input">URL del video</label>
        <input
          id="youtube-input"
          class="field-input"
          type="url"
          inputmode="url"
          placeholder="https://youtube.com/watch?v=…"
          autocomplete="off"
          spellcheck="false"
        />
        <p class="field-note">El backend lee el stream directo; no descarga el video.</p>
        <button id="youtube-btn" class="btn btn-primary btn-block" type="button">
          ${icon("youtube")}
          <span>Analizar video</span>
        </button>
      </div>

      <!-- Cámara por URL -->
      <div
        class="source-panel hidden"
        id="source-panel-url"
        role="tabpanel"
        aria-labelledby="source-tab-url"
        data-source-panel="url"
      >
        <label class="field-label" for="url-input">URL del stream</label>
        <input
          id="url-input"
          class="field-input"
          type="url"
          inputmode="url"
          placeholder="http://192.168.1.50:4747/video"
          autocomplete="off"
          spellcheck="false"
        />
        <p class="field-note">Admite HTTP(S), MJPEG y RTSP accesibles desde el backend.</p>
        <button id="url-btn" class="btn btn-primary btn-block" type="button">
          ${icon("link")}
          <span>Conectar stream</span>
        </button>
      </div>

      <button id="stop-btn" class="btn btn-danger-ghost btn-block hidden" type="button">
        ${icon("stop")}
        <span>Detener análisis</span>
      </button>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2 class="panel-title">Multicámara</h2>
        <span id="multi-cam-count" class="pill pill-muted">0 activas</span>
      </div>

      <button id="multi-cam-open" class="btn btn-outline btn-block" type="button" aria-haspopup="dialog">
        ${icon("plus")}
        <span>Añadir cámara</span>
      </button>

      <div id="multi-cam-list" class="cam-list" role="list"></div>

      <button id="multi-cam-stop" class="btn btn-danger-ghost btn-block hidden" type="button">
        ${icon("stop")}
        <span>Detener todas</span>
      </button>
    </section>

    <div class="status-bar" role="status" aria-live="polite">
      <span id="loader" class="loader hidden" aria-hidden="true"></span>
      <span id="status" class="status-text">Esperando una fuente…</span>
    </div>
  </aside>
`;
