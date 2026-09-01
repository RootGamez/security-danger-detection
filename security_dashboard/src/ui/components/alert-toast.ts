/**
 * Toasts de alerta de seguridad.
 *
 * Se apilan abajo a la derecha, se auto-descartan y se deduplican por
 * clase + zona de la imagen: un cuchillo quieto en escena dispara una alerta
 * por fotograma en el backend, y sin deduplicar inundaría la pantalla.
 *
 * Accesibilidad: el contenedor es `aria-live="assertive"` pero nunca roba el
 * foco, según la pauta `toast-accessibility`.
 */

import type { SafetyAlert } from "../../types/domain";
import { severityForClass } from "../utils/colors";
import { asPercent, capitalize, escapeHtml } from "../utils/format";
import { icon, iconForClass } from "../utils/icons";

const TOAST_DURATION_MS = 6_000;
const TOAST_FADEOUT_MS = 320;
const MAX_VISIBLE_TOASTS = 3;
const DEDUPE_WINDOW_MS = 4_000;

/** Confianza mínima para molestar al usuario con un toast. */
const MIN_CONFIDENCE = 0.6;

// ── Contenedor ─────────────────────────────────────────────────────────────

let _container: HTMLElement | null = null;

const getContainer = (): HTMLElement => {
  if (_container?.isConnected) return _container;

  const container = document.createElement("div");
  container.className = "toast-stack";
  container.setAttribute("aria-live", "assertive");
  container.setAttribute("aria-atomic", "false");
  document.body.appendChild(container);

  _container = container;
  return container;
};

// ── Construcción ───────────────────────────────────────────────────────────

const dismissToast = (toast: HTMLElement): void => {
  if (toast.dataset.leaving === "true") return;
  toast.dataset.leaving = "true";
  toast.classList.add("toast-leaving");
  setTimeout(() => toast.remove(), TOAST_FADEOUT_MS);
};

const buildToast = (alert: SafetyAlert): HTMLElement => {
  const severity = severityForClass(alert.class);
  const toast = document.createElement("div");
  toast.className = `toast toast-${severity}`;
  toast.setAttribute("role", "alert");

  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icon(iconForClass(alert.class), { size: 18 })}</span>
    <div class="toast-body">
      <div class="toast-head">
        <p class="toast-title">${escapeHtml(alert.type)}</p>
        <button class="icon-btn icon-btn-sm toast-close" type="button" aria-label="Descartar alerta">
          ${icon("close", { size: 13 })}
        </button>
      </div>
      <div class="toast-tags">
        <span class="tag">${escapeHtml(capitalize(alert.class))}</span>
        <span class="tag tag-mono">${asPercent(alert.confidence)}</span>
        ${alert.cameraId ? `<span class="tag">${escapeHtml(alert.cameraId)}</span>` : ""}
      </div>
      <span class="toast-progress" style="--toast-duration:${TOAST_DURATION_MS}ms" aria-hidden="true"></span>
    </div>`;

  toast.querySelector(".toast-close")?.addEventListener("click", () => dismissToast(toast));
  return toast;
};

// ── Deduplicación ──────────────────────────────────────────────────────────

const _recentKeys = new Map<string, number>();

/** Agrupa por cámara, clase y celda de 50 px para tolerar micro-movimientos. */
const dedupeKey = (alert: SafetyAlert): string => {
  const cell = alert.bbox.map((value) => Math.round(value / 50)).join(",");
  return `${alert.cameraId ?? "global"}|${alert.class}|${cell}`;
};

const isDuplicate = (alert: SafetyAlert): boolean => {
  const key = dedupeKey(alert);
  const now = Date.now();

  for (const [existingKey, expiry] of _recentKeys) {
    if (expiry <= now) _recentKeys.delete(existingKey);
  }

  if (_recentKeys.has(key)) return true;
  _recentKeys.set(key, now + DEDUPE_WINDOW_MS);
  return false;
};

// ── API pública ────────────────────────────────────────────────────────────

/** Muestra un toast si la alerta no es un duplicado reciente. */
export const showAlertToast = (alert: SafetyAlert): boolean => {
  if (isDuplicate(alert)) return false;

  const container = getContainer();
  const visible = container.querySelectorAll(".toast:not(.toast-leaving)");
  if (visible.length >= MAX_VISIBLE_TOASTS) {
    dismissToast(visible[0] as HTMLElement); // hace sitio descartando el más antiguo
  }

  const toast = buildToast(alert);
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-visible"));
  setTimeout(() => dismissToast(toast), TOAST_DURATION_MS);

  return true;
};

/**
 * Procesa el lote de alertas de un fotograma.
 * @returns cuántos toasts nuevos se mostraron (para el contador de alertas).
 */
export const showAlertToasts = (alerts: SafetyAlert[] | undefined): number => {
  if (!alerts?.length) return 0;

  let shown = 0;
  for (const alert of alerts) {
    if (alert.confidence >= MIN_CONFIDENCE && showAlertToast(alert)) shown++;
  }
  return shown;
};
