/**
 * Diálogos modales: configuración del backend y alta de cámaras.
 *
 * Ambos comparten la estructura `.modal > .modal-scrim + .modal-card` y el
 * mismo comportamiento (Escape, clic en el fondo, foco atrapado) que aplica
 * `components/modal.ts`.
 */

import { FILE_ACCEPT } from "../../config/media";
import { icon } from "../utils/icons";

const backendModal = `
  <div id="backend-modal" class="modal hidden" aria-hidden="true">
    <div class="modal-scrim" data-close="true"></div>
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="backend-modal-title">
      <header class="modal-header">
        <div>
          <h2 class="modal-title" id="backend-modal-title">Backend de inferencia</h2>
          <p class="modal-subtitle">Pega aquí la URL que expone tu notebook de Colab.</p>
        </div>
        <button id="backend-close" class="icon-btn" type="button" aria-label="Cerrar">
          ${icon("close", { size: 16 })}
        </button>
      </header>

      <div class="modal-body">
        <label class="field-label" for="backend-input">URL base</label>
        <input
          id="backend-input"
          class="field-input field-input-mono"
          type="url"
          inputmode="url"
          placeholder="https://tu-tunel.loca.lt"
          autocomplete="off"
          spellcheck="false"
          aria-describedby="backend-feedback"
        />
        <p id="backend-feedback" class="field-note" role="status" aria-live="polite"></p>

        <div class="modal-actions">
          <button id="backend-save" class="btn btn-primary" type="button">
            ${icon("check")}
            <span>Guardar y probar</span>
          </button>
          <button id="backend-test" class="btn btn-outline" type="button">
            ${icon("refresh")}
            <span>Reintentar</span>
          </button>
          <button id="backend-reset" class="btn btn-ghost" type="button">
            <span>Usar valor de .env</span>
          </button>
        </div>

        <dl class="info-grid">
          <div class="info-row">
            <dt>Origen actual</dt>
            <dd id="backend-origin">—</dd>
          </div>
          <div class="info-row">
            <dt>Valor en .env</dt>
            <dd id="backend-env-url" class="mono">—</dd>
          </div>
          <div class="info-row">
            <dt>Dispositivo</dt>
            <dd id="backend-device">—</dd>
          </div>
        </dl>

        <p class="modal-footnote">
          Se guarda en este navegador y tiene prioridad sobre <code>.env</code>.
          También puedes abrir el dashboard con <code>?api=&lt;url&gt;</code>.
        </p>
      </div>
    </div>
  </div>
`;

const multiCamModal = `
  <div id="multi-cam-modal" class="modal hidden" aria-hidden="true">
    <div class="modal-scrim" data-close="true"></div>
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="multi-modal-title">
      <header class="modal-header">
        <div>
          <h2 class="modal-title" id="multi-modal-title">Añadir cámara</h2>
          <p class="modal-subtitle">Cada fuente se analiza en paralelo en la rejilla.</p>
        </div>
        <button id="multi-cam-close" class="icon-btn" type="button" aria-label="Cerrar">
          ${icon("close", { size: 16 })}
        </button>
      </header>

      <div class="modal-body">
        <div class="source-option">
          <p class="source-option-title">${icon("youtube", { size: 15 })}<span>YouTube</span></p>
          <div class="input-row">
            <input
              id="multi-yt-input"
              class="field-input"
              type="url"
              inputmode="url"
              placeholder="https://youtube.com/watch?v=…"
              aria-label="URL de YouTube"
              autocomplete="off"
            />
            <button id="multi-yt-add" class="btn btn-primary" type="button">Añadir</button>
          </div>
        </div>

        <div class="source-option">
          <p class="source-option-title">${icon("link", { size: 15 })}<span>Cámara por URL</span></p>
          <div class="input-row">
            <input
              id="multi-url-input"
              class="field-input"
              type="url"
              inputmode="url"
              placeholder="http://192.168.1.50:4747/video"
              aria-label="URL de la cámara"
              autocomplete="off"
            />
            <button id="multi-url-add" class="btn btn-primary" type="button">Añadir</button>
          </div>
        </div>

        <div class="source-option">
          <p class="source-option-title">${icon("folder", { size: 15 })}<span>Archivo local</span></p>
          <input id="multi-file-input" type="file" accept="${FILE_ACCEPT}" class="visually-hidden" />
          <div class="input-row">
            <button id="multi-file-browse" class="btn btn-outline" type="button">Examinar…</button>
            <span id="multi-file-name" class="file-name">Sin archivo</span>
            <button id="multi-file-add" class="btn btn-primary" type="button">Añadir</button>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

export const modalsTemplate = `${backendModal}${multiCamModal}`;
