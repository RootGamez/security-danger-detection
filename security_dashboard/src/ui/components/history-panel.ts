/**
 * Cajón lateral con el historial de sesiones analizadas.
 *
 * Se monta una sola vez sobre `<body>` y se repinta cuando el store cambia.
 * El historial persiste en localStorage, así que sobrevive a un refresco:
 * es lo que permite comparar el mismo clip entre dos modelos de Colab.
 */

import {
  clearHistory,
  getHistory,
  onHistoryChange,
  removeHistoryEntry,
} from "../../services/history.service";
import type { ClassCount, HistoryEntry, HistorySource } from "../../types/domain";
import { colorForClass } from "../utils/colors";
import { asPercent, capitalize, countLabel, escapeHtml, timeAgo, truncateMiddle } from "../utils/format";
import { icon, iconForClass, type IconName } from "../utils/icons";
import { createModal, type ModalController } from "./modal";

const SOURCE_META: Record<HistorySource, { iconName: IconName; label: string }> = {
  image: { iconName: "image", label: "Imagen" },
  video: { iconName: "film", label: "Video" },
  webcam: { iconName: "camera", label: "Cámara" },
  youtube: { iconName: "youtube", label: "YouTube" },
  camera: { iconName: "link", label: "Stream" },
};

// ── Plantillas de tarjeta ──────────────────────────────────────────────────

const classPills = (classCounts: ClassCount[]): string =>
  [...classCounts]
    .sort((a, b) => b.count - a.count)
    .map((count) => {
      const color = colorForClass(count.class);
      return `
        <span class="hist-pill" style="--pill-color:${color}">
          ${icon(iconForClass(count.class), { size: 12 })}
          <span>${escapeHtml(capitalize(count.class))}</span>
          <span class="hist-pill-count">×${count.count}</span>
          <span class="hist-pill-conf">${asPercent(count.maxConfidence)}</span>
        </span>`;
    })
    .join("");

const buildEntryCard = (entry: HistoryEntry): HTMLElement => {
  const meta = SOURCE_META[entry.source] ?? SOURCE_META.video;

  const card = document.createElement("article");
  card.className = "hist-card";
  card.dataset.id = entry.id;

  const frames = entry.frameCount != null ? ` · ${entry.frameCount} fotogramas` : "";

  card.innerHTML = `
    <header class="hist-card-head">
      <span class="hist-source" aria-hidden="true">${icon(meta.iconName, { size: 15 })}</span>
      <div class="hist-card-meta">
        <p class="hist-card-title" title="${escapeHtml(entry.label)}">
          ${escapeHtml(truncateMiddle(entry.label, 38))}
        </p>
        <p class="hist-card-sub">${escapeHtml(`${timeAgo(entry.timestamp)} · ${meta.label}${frames}`)}</p>
      </div>
      <button class="icon-btn icon-btn-sm hist-delete" type="button"
              aria-label="Eliminar del historial">${icon("trash", { size: 13 })}</button>
    </header>

    <div class="hist-pills">
      ${
        entry.classCounts.length > 0
          ? classPills(entry.classCounts)
          : '<span class="hist-empty-note">Sin detecciones</span>'
      }
    </div>

    ${
      entry.alerts.length > 0
        ? `<div class="hist-alerts">
             <span class="hist-alert-badge">
               ${icon("alert", { size: 12 })}
               <span>${escapeHtml(countLabel(entry.alerts.length, "alerta", "alertas"))}</span>
             </span>
             ${entry.alerts
               .map((alert) => `<span class="tag">${escapeHtml(alert.type)}</span>`)
               .join("")}
           </div>`
        : ""
    }`;

  card.querySelector(".hist-delete")?.addEventListener("click", (event) => {
    event.stopPropagation();
    removeHistoryEntry(entry.id);
  });

  return card;
};

const emptyState = (): string => `
  <div class="empty-state">
    <span class="empty-icon" aria-hidden="true">${icon("inbox", { size: 26 })}</span>
    <p class="empty-title">Todavía no hay sesiones</p>
    <p class="empty-hint">Analiza una imagen, un video o una cámara y aparecerá aquí.</p>
  </div>`;

// ── Ciclo de vida del cajón ────────────────────────────────────────────────

type Panel = {
  modal: ModalController;
  list: HTMLElement;
  count: HTMLElement;
  clearBtn: HTMLButtonElement;
};

let _panel: Panel | null = null;

const createPanel = (): Panel => {
  const drawer = document.createElement("div");
  drawer.className = "modal drawer-modal hidden";
  drawer.setAttribute("aria-hidden", "true");
  drawer.innerHTML = `
    <div class="modal-scrim" data-close="true"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="history-title">
      <header class="drawer-header">
        <div>
          <h2 class="modal-title" id="history-title">Historial</h2>
          <p class="modal-subtitle" id="history-count">0 sesiones</p>
        </div>
        <div class="drawer-actions">
          <button id="history-clear" class="btn btn-ghost btn-sm" type="button">
            ${icon("trash", { size: 13 })}
            <span>Limpiar</span>
          </button>
          <button id="history-close" class="icon-btn" type="button" aria-label="Cerrar historial">
            ${icon("close", { size: 16 })}
          </button>
        </div>
      </header>
      <div id="history-list" class="drawer-body">${emptyState()}</div>
    </aside>`;

  document.body.appendChild(drawer);

  const list = drawer.querySelector<HTMLElement>("#history-list")!;
  const count = drawer.querySelector<HTMLElement>("#history-count")!;
  const clearBtn = drawer.querySelector<HTMLButtonElement>("#history-clear")!;

  const modal = createModal(drawer, { initialFocus: "#history-close" });

  drawer.querySelector("#history-close")?.addEventListener("click", () => modal.close());
  clearBtn.addEventListener("click", () => clearHistory());

  const panel: Panel = { modal, list, count, clearBtn };
  onHistoryChange(() => render(panel));
  render(panel);

  return panel;
};

/** Repinta la lista completa: el historial es corto y así no hay estado que sincronizar. */
const render = (panel: Panel): void => {
  const entries = getHistory();
  panel.count.textContent = countLabel(entries.length, "sesión", "sesiones");
  panel.clearBtn.disabled = entries.length === 0;

  if (entries.length === 0) {
    panel.list.innerHTML = emptyState();
    return;
  }

  const fragment = document.createDocumentFragment();
  entries.forEach((entry) => fragment.appendChild(buildEntryCard(entry)));
  panel.list.replaceChildren(fragment);
};

// ── API pública ────────────────────────────────────────────────────────────

export const initHistoryPanel = (): void => {
  _panel ??= createPanel();
};

export const openHistoryPanel = (): void => {
  _panel ??= createPanel();
  _panel.modal.open();
};

export const closeHistoryPanel = (): void => _panel?.modal.close();
