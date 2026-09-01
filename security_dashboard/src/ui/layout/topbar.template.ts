/**
 * Barra superior: marca, estado del backend y controles globales.
 *
 * La pastilla de backend es el control más importante del dashboard: la URL
 * del túnel de Colab cambia en cada sesión, así que está siempre visible y a
 * un clic de poder editarse.
 */

import { APP_NAME } from "../../config/env";
import { escapeHtml } from "../utils/format";
import { icon } from "../utils/icons";

export const topbarTemplate = `
  <header class="topbar">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">${icon("shield", { size: 20 })}</span>
      <span class="brand-text">
        <span class="brand-name">${escapeHtml(APP_NAME)}</span>
        <span class="brand-tagline">Detección de riesgos en tiempo real</span>
      </span>
    </div>

    <div class="topbar-actions">
      <div class="conf-control" role="group" aria-labelledby="conf-label">
        <label class="conf-label" id="conf-label" for="conf-slider">
          ${icon("sliders", { size: 14 })}
          <span>Confianza</span>
        </label>
        <input
          id="conf-slider"
          class="conf-slider"
          type="range"
          min="5"
          max="95"
          step="5"
          aria-describedby="conf-value"
        />
        <output id="conf-value" class="conf-value" for="conf-slider">35%</output>
      </div>

      <button
        id="backend-pill"
        class="backend-pill"
        type="button"
        aria-haspopup="dialog"
        title="Configurar la URL del backend"
      >
        <span id="backend-dot" class="conn-dot" data-status="unknown" aria-hidden="true"></span>
        <span class="backend-pill-text">
          <span id="backend-url-label" class="backend-url">Sin configurar</span>
          <span id="backend-meta" class="backend-meta">Comprobando…</span>
        </span>
        ${icon("server", { size: 15, className: "backend-pill-icon" })}
      </button>

      <button id="history-btn" class="btn btn-ghost" type="button" aria-haspopup="dialog">
        ${icon("history")}
        <span>Historial</span>
      </button>
    </div>
  </header>
`;
