/**
 * Carril derecho: detecciones del fotograma actual.
 * En pantallas estrechas se recoloca bajo el escenario (ver `layout.css`).
 */

import { icon } from "../utils/icons";

export const railTemplate = `
  <section class="rail" aria-label="Detecciones del fotograma actual">
    <div class="panel-header">
      <h2 class="panel-title">Detecciones</h2>
      <span id="results-count" class="pill pill-muted">0</span>
    </div>

    <div id="results" class="results-list" role="list" aria-live="polite">
      <div class="empty-state">
        <span class="empty-icon" aria-hidden="true">${icon("search", { size: 22 })}</span>
        <p class="empty-title">Sin detecciones</p>
        <p class="empty-hint">Inicia una fuente para ver los objetos detectados.</p>
      </div>
    </div>
  </section>
`;
