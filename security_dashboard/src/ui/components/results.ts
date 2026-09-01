/**
 * Lista de detecciones del fotograma actual (carril derecho).
 */

import type { DetectionPayload } from "../../types/domain";
import { colorForClass } from "../utils/colors";
import { asPercent, capitalize, escapeHtml } from "../utils/format";
import { icon, iconForClass } from "../utils/icons";
import type { UIRefs } from "../refs";

const emptyState = (title: string, hint: string): string => `
  <div class="empty-state">
    <span class="empty-icon" aria-hidden="true">${icon("search", { size: 22 })}</span>
    <p class="empty-title">${escapeHtml(title)}</p>
    <p class="empty-hint">${escapeHtml(hint)}</p>
  </div>`;

const detectionCard = (detection: DetectionPayload): string => {
  const color = colorForClass(detection.class);
  const confidence = Math.max(0, Math.min(1, detection.confidence));

  return `
    <div class="detection-card" role="listitem" style="--detection-color:${color}">
      <span class="detection-icon" aria-hidden="true">${icon(iconForClass(detection.class), { size: 15 })}</span>
      <span class="detection-body">
        <span class="detection-name">${escapeHtml(capitalize(detection.class))}</span>
        <span class="detection-meter" aria-hidden="true">
          <span class="detection-meter-fill" style="width:${(confidence * 100).toFixed(1)}%"></span>
        </span>
      </span>
      <span class="detection-conf">${asPercent(confidence, 1)}</span>
    </div>`;
};

/** Repinta la lista completa con las detecciones del fotograma actual. */
export const renderDetections = (refs: UIRefs, detections: DetectionPayload[]): void => {
  refs.resultsCount.textContent = String(detections.length);

  if (detections.length === 0) {
    refs.resultsBox.innerHTML = emptyState("Sin detecciones", "Nada relevante en el fotograma actual.");
    return;
  }

  refs.resultsBox.innerHTML = [...detections]
    .sort((a, b) => b.confidence - a.confidence)
    .map(detectionCard)
    .join("");
};

/**
 * Estado para cuando el backend sólo envía el conteo y no el detalle
 * (algunos endpoints de stream lo hacen para ahorrar ancho de banda).
 */
export const renderDetectionCount = (refs: UIRefs, count: number): void => {
  refs.resultsCount.textContent = String(count);
  refs.resultsBox.innerHTML =
    count > 0
      ? `<p class="results-hint">${count} objeto(s) detectado(s) en este fotograma.</p>`
      : emptyState("Sin detecciones", "Nada relevante en el fotograma actual.");
};

/** Mensaje de error dentro del carril de resultados. */
export const renderResultsError = (refs: UIRefs, message: string): void => {
  refs.resultsCount.textContent = "0";
  refs.resultsBox.innerHTML = `
    <div class="empty-state empty-state-error">
      <span class="empty-icon" aria-hidden="true">${icon("alert", { size: 22 })}</span>
      <p class="empty-title">No se pudo analizar</p>
      <p class="empty-hint">${escapeHtml(message)}</p>
    </div>`;
};

/**
 * En modo multicámara el detalle vive en cada tarjeta de la rejilla, así que
 * el carril explica dónde mirar en lugar de mostrar datos de otra sesión.
 */
export const renderMultiCamNotice = (refs: UIRefs): void => {
  refs.resultsCount.textContent = "—";
  refs.resultsBox.innerHTML = `
    <div class="empty-state">
      <span class="empty-icon" aria-hidden="true">${icon("grid", { size: 22 })}</span>
      <p class="empty-title">Modo multicámara</p>
      <p class="empty-hint">Cada tarjeta muestra su propio vídeo anotado; las alertas llegan etiquetadas con la cámara de origen.</p>
    </div>`;
};

/** Devuelve el carril al estado inicial. */
export const resetResults = (refs: UIRefs): void => {
  refs.resultsCount.textContent = "0";
  refs.resultsBox.innerHTML = emptyState(
    "Sin detecciones",
    "Inicia una fuente para ver los objetos detectados.",
  );
};
