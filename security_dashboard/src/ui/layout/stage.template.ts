/**
 * Escenario principal: métricas de sesión, vista previa y rejilla multicámara.
 */

import { icon } from "../utils/icons";

type StatTile = {
  id: string;
  label: string;
  iconName: Parameters<typeof icon>[0];
  hint: string;
};

const STATS: StatTile[] = [
  { id: "fps", label: "FPS", iconName: "activity", hint: "Fotogramas por segundo recibidos" },
  { id: "frames", label: "Fotogramas", iconName: "film", hint: "Fotogramas analizados" },
  { id: "detections", label: "Detecciones", iconName: "target", hint: "Objetos en el último fotograma" },
  { id: "alerts", label: "Alertas", iconName: "alert", hint: "Alertas de seguridad de la sesión" },
];

const statTiles = STATS.map(
  (stat) => `
    <div class="stat-tile" data-stat="${stat.id}" title="${stat.hint}">
      <span class="stat-icon" aria-hidden="true">${icon(stat.iconName, { size: 15 })}</span>
      <span class="stat-body">
        <span class="stat-value" id="stat-${stat.id}">0</span>
        <span class="stat-label">${stat.label}</span>
      </span>
    </div>`,
).join("");

export const stageTemplate = `
  <main class="stage" aria-label="Vista de análisis">
    <div class="stage-header">
      <div class="stage-heading">
        <h2 class="stage-title" id="stage-title">Sin fuente activa</h2>
        <p class="stage-subtitle" id="stage-subtitle">
          Elige un archivo, una cámara o una URL para empezar a analizar.
        </p>
      </div>
      <div class="stat-row" role="group" aria-label="Métricas de la sesión">
        ${statTiles}
      </div>
    </div>

    <div id="preview-container" class="preview-container">
      <div id="box-overlay" class="box-overlay" aria-hidden="true"></div>

      <div id="preview-placeholder" class="preview-placeholder">
        <span class="placeholder-icon" aria-hidden="true">${icon("image", { size: 30 })}</span>
        <p class="placeholder-title">Vista previa</p>
        <p class="placeholder-hint">Los fotogramas anotados aparecerán aquí</p>
      </div>

      <img id="preview" class="preview-media hidden" alt="Fotograma analizado con las detecciones marcadas" />
      <video id="preview-video" class="preview-media hidden" controls playsinline></video>
      <canvas id="webcam-canvas" class="preview-media hidden"></canvas>
    </div>

    <div id="multi-cam-grid" class="cam-grid hidden" aria-label="Rejilla multicámara"></div>
  </main>
`;
