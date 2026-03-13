/**
 * AlertToast — sistema moderno de alertas de seguridad.
 * Muestra toasts apilados y auto-descartables cuando el backend detecta
 * objetos peligrosos (knife, backpack, suitcase, cell phone, dog).
 */

import type { SafetyAlert } from "../../types/domain";

// ── Configuration ─────────────────────────────────────────────────────────
const TOAST_DURATION_MS  = 6_000;   // how long each toast stays visible
const TOAST_FADEOUT_MS   = 500;     // CSS transition duration before removal
const MAX_VISIBLE_TOASTS = 5;

// ── Toast container ────────────────────────────────────────────────────────

function getOrCreateContainer(): HTMLElement {
  let container = document.getElementById("alert-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "alert-toast-container";
    document.body.appendChild(container);
  }
  return container;
}

// ── Emoji e color por clase COCO ───────────────────────────────────────────

const CLASS_META: Record<string, { emoji: string; colorClass: string }> = {
  knife:    { emoji: "🔪", colorClass: "toast-danger" },
  backpack: { emoji: "🎒", colorClass: "toast-warning" },
  dog:      { emoji: "🐕", colorClass: "toast-warning" },
};

function getClassMeta(cls: string) {
  return CLASS_META[cls.toLowerCase()] ?? { emoji: "⚠️", colorClass: "toast-warning" };
}

// ── Core toast builder ─────────────────────────────────────────────────────

function buildToastElement(alert: SafetyAlert, id: string): HTMLElement {
  const { emoji, colorClass } = getClassMeta(alert.class);
  const pct = Math.round(alert.confidence * 100);
  const classLabel = alert.class.charAt(0).toUpperCase() + alert.class.slice(1);
  const cameraLabel = alert.cameraId ? `Camara ${alert.cameraId}` : "";

  const toast = document.createElement("div");
  toast.id = id;
  toast.className = `alert-toast ${colorClass}`;
  toast.innerHTML = `
    <div class="toast-icon-wrap">
      <span class="toast-emoji">${emoji}</span>
      <span class="toast-pulse-ring"></span>
    </div>
    <div class="toast-body">
      <div class="toast-header-row">
        <span class="toast-title">⚠ Alerta de Seguridad</span>
        <button class="toast-close" aria-label="Cerrar alerta">✕</button>
      </div>
      <p class="toast-message">${alert.type}</p>
      <div class="toast-meta-row">
        <span class="toast-badge toast-badge-vehicle">${classLabel}</span>
        <span class="toast-badge toast-badge-conf">${pct}% confianza</span>
        ${cameraLabel ? `<span class="toast-badge toast-badge-camera">${cameraLabel}</span>` : ""}
      </div>
      <div class="toast-progress-bar">
        <div class="toast-progress-fill" style="animation-duration:${TOAST_DURATION_MS}ms"></div>
      </div>
    </div>
  `;

  toast.querySelector(".toast-close")?.addEventListener("click", () => dismissToast(toast));
  return toast;
}

// ── Dismiss ────────────────────────────────────────────────────────────────

function dismissToast(toast: HTMLElement): void {
  toast.classList.add("toast-leaving");
  setTimeout(() => toast.remove(), TOAST_FADEOUT_MS);
}

// ── Deduplication ─────────────────────────────────────────────────────────

const _recentKeys = new Set<string>();

function makeDedupeKey(alert: SafetyAlert): string {
  const roundedBbox = alert.bbox.map((v) => Math.round(v / 50)).join(",");
  return `${alert.cameraId ?? "global"}|${alert.class}|${roundedBbox}`;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Show a toast for a safety alert.
 * Automatically deduplicates alerts within a 2-second window.
 */
export function showAlertToast(alert: SafetyAlert): void {
  const key = makeDedupeKey(alert);
  if (_recentKeys.has(key)) return;

  _recentKeys.add(key);
  setTimeout(() => _recentKeys.delete(key), 2_000);

  const container = getOrCreateContainer();

  // Limit visible toasts
  const existing = container.querySelectorAll(".alert-toast:not(.toast-leaving)");
  if (existing.length >= MAX_VISIBLE_TOASTS) return;

  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const toast = buildToastElement(alert, id);

  container.prepend(toast);
  // Trigger entrance animation on next frame
  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  // Auto-dismiss
  setTimeout(() => dismissToast(toast), TOAST_DURATION_MS);
}

/** Confianza mínima (0–1) para mostrar una alerta. Igual al umbral del backend. */
const MIN_CONFIDENCE = 0.60;

/**
 * Show toasts for all alerts in a batch, de-duplicating across the batch.
 * Only alerts with confidence > MIN_CONFIDENCE are displayed.
 */
export function showAlertToasts(alerts: SafetyAlert[] | undefined): void {
  if (!alerts || alerts.length === 0) return;
  for (const alert of alerts) {
    if (alert.confidence > MIN_CONFIDENCE) showAlertToast(alert);
  }
}
