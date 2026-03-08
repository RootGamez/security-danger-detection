/**
 * History panel — slide-in drawer showing all past detection sessions.
 * Self-contained: injects its own DOM into <body> and manages open/close state.
 */

import type { ClassCount, HistoryEntry, HistorySource } from "../../types/domain";
import { getHistory, clearHistory, removeHistoryEntry, onHistoryChange } from "../../services/history.service";
import { colorForClass } from "../utils/colors";

// ── Source meta ────────────────────────────────────────────────────────────

const SOURCE_META: Record<HistorySource, { icon: string; label: string }> = {
  image:   { icon: "🖼️",  label: "Imagen"        },
  video:   { icon: "🎬",  label: "Video"         },
  webcam:  { icon: "📷",  label: "Cámara en vivo" },
  youtube: { icon: "▶️",  label: "YouTube"       },
};

// ── Emoji per class ────────────────────────────────────────────────────────

const CLASS_EMOJI: Record<string, string> = {
  person:       "👤",
  knife:        "🔪",
  backpack:     "🎒",
  suitcase:     "🧳",
  "cell phone": "📱",
  dog:          "🐕",
};

const emojiFor = (cls: string) => CLASS_EMOJI[cls.toLowerCase()] ?? "🔍";

// ── Time formatting ────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60)  return "hace un momento";
  if (secs < 3600) return `hace ${Math.floor(secs / 60)} min`;
  if (secs < 86400) return `hace ${Math.floor(secs / 3600)} h`;
  return date.toLocaleDateString("es", { day: "2-digit", month: "short" });
}

// ── Entry card HTML ────────────────────────────────────────────────────────

function renderClassPills(classCounts: ClassCount[]): string {
  return classCounts
    .sort((a, b) => b.count - a.count)
    .map((cc) => {
      const color = colorForClass(cc.class);
      const pct   = Math.round(cc.maxConfidence * 100);
      return `
        <span class="hentry-pill" style="border-color:${color}33;color:${color}">
          ${emojiFor(cc.class)}
          <span class="hentry-pill-name">${cc.class}</span>
          <span class="hentry-pill-count">×${cc.count}</span>
          <span class="hentry-pill-conf">${pct}%</span>
        </span>`;
    })
    .join("");
}

function buildEntryCard(entry: HistoryEntry): HTMLElement {
  const { icon, label: sourceLabel } = SOURCE_META[entry.source];
  const shortLabel = entry.label.length > 36
    ? "…" + entry.label.slice(-33)
    : entry.label;
  const alertCount = entry.alerts.length;

  const card = document.createElement("div");
  card.className = "hentry-card";
  card.dataset.id = entry.id;

  card.innerHTML = `
    <div class="hentry-header">
      <div class="hentry-meta">
        <span class="hentry-source-icon">${icon}</span>
        <div class="hentry-meta-text">
          <p class="hentry-label" title="${entry.label}">${shortLabel}</p>
          <p class="hentry-time">
            ${timeAgo(entry.timestamp)} · ${sourceLabel}
            ${entry.frameCount != null ? ` · ${entry.frameCount} frames` : ""}
          </p>
        </div>
      </div>
      <button class="hentry-delete" data-id="${entry.id}" title="Eliminar del historial">✕</button>
    </div>

    <div class="hentry-pills">
      ${entry.classCounts.length > 0
        ? renderClassPills(entry.classCounts)
        : '<span class="hentry-empty">Sin detecciones</span>'}
    </div>

    ${alertCount > 0 ? `
      <div class="hentry-alert-row">
        <span class="hentry-alert-badge">
          ⚠ ${alertCount} alerta${alertCount > 1 ? "s" : ""} de seguridad
        </span>
        <div class="hentry-alert-list">
          ${entry.alerts.map((a) => `<span class="hentry-alert-item">${a.type}</span>`).join("")}
        </div>
      </div>` : ""}
  `;

  card.querySelector<HTMLButtonElement>(".hentry-delete")
    ?.addEventListener("click", (e) => {
      e.stopPropagation();
      removeHistoryEntry(entry.id);
    });

  return card;
}

// ── Panel DOM lifecycle ────────────────────────────────────────────────────

let _overlay: HTMLElement | null = null;
let _drawer: HTMLElement | null  = null;
let _listEl: HTMLElement | null  = null;
let _countEl: HTMLElement | null = null;

function createPanelDOM(): void {
  _overlay = document.createElement("div");
  _overlay.id = "history-overlay";
  _overlay.addEventListener("click", closeHistoryPanel);

  _drawer = document.createElement("div");
  _drawer.id = "history-drawer";
  _drawer.setAttribute("role", "dialog");
  _drawer.setAttribute("aria-label", "Historial de detecciones");
  _drawer.innerHTML = `
    <div class="history-header">
      <div class="history-header-left">
        <span class="history-icon">📋</span>
        <div>
          <h2 class="history-title">Historial</h2>
          <p class="history-subtitle" id="history-count">0 sesiones</p>
        </div>
      </div>
      <div class="history-header-actions">
        <button id="history-clear-btn" class="btn-history-clear" title="Limpiar historial">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
          Limpiar
        </button>
        <button id="history-close-btn" class="btn-history-close" title="Cerrar">✕</button>
      </div>
    </div>
    <div id="history-list" class="history-list">
      <div class="history-empty-state" id="history-empty">
        <span style="font-size:2rem">🔍</span>
        <p>No hay sesiones registradas aún.</p>
        <p style="font-size:.75rem;color:#475569">Analiza una imagen, video o cámara para ver el historial aquí.</p>
      </div>
    </div>
  `;

  _listEl  = _drawer.querySelector("#history-list");
  _countEl = _drawer.querySelector("#history-count");

  _drawer.querySelector("#history-close-btn")
    ?.addEventListener("click", closeHistoryPanel);

  _drawer.querySelector("#history-clear-btn")
    ?.addEventListener("click", () => clearHistory());

  document.body.appendChild(_overlay);
  document.body.appendChild(_drawer);

  // Keyboard: Escape to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && _drawer?.classList.contains("open")) closeHistoryPanel();
  });

  // Subscribe to store changes so the panel auto-refreshes
  onHistoryChange(() => refreshPanel());
}

function refreshPanel(): void {
  if (!_listEl || !_countEl) return;
  const entries = getHistory();

  _countEl.textContent = `${entries.length} sesión${entries.length !== 1 ? "es" : ""}`;

  const emptyEl = _listEl.querySelector("#history-empty") as HTMLElement | null;

  if (entries.length === 0) {
    // Remove all cards but keep empty state
    _listEl.querySelectorAll(".hentry-card").forEach((el) => el.remove());
    if (emptyEl) emptyEl.style.display = "flex";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";

  // Sync cards: remove deleted ones
  const currentIds = new Set(entries.map((e) => e.id));
  _listEl.querySelectorAll<HTMLElement>(".hentry-card").forEach((el) => {
    if (!currentIds.has(el.dataset.id ?? "")) el.remove();
  });

  // Prepend new cards (entries are sorted newest-first)
  entries.forEach((entry, idx) => {
    const existing = _listEl!.querySelector(`[data-id="${entry.id}"]`);
    if (!existing) {
      const card = buildEntryCard(entry);
      // Insert at correct position
      const allCards = _listEl!.querySelectorAll(".hentry-card");
      if (idx === 0 || allCards.length === 0) {
        _listEl!.prepend(card);
      } else {
        _listEl!.insertBefore(card, allCards[idx] ?? null);
      }
    }
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

export function initHistoryPanel(): void {
  if (!_drawer) createPanelDOM();
}

export function openHistoryPanel(): void {
  if (!_drawer) createPanelDOM();
  refreshPanel();
  requestAnimationFrame(() => {
    _overlay?.classList.add("open");
    _drawer?.classList.add("open");
  });
}

export function closeHistoryPanel(): void {
  _overlay?.classList.remove("open");
  _drawer?.classList.remove("open");
}
