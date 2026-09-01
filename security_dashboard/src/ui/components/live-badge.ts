/**
 * Distintivo "EN VIVO" sobre la vista previa mientras hay un stream activo.
 */

const BADGE_CLASS = "live-badge";

export const showLiveBadge = (container: HTMLElement, visible: boolean): void => {
  const existing = container.querySelector(`.${BADGE_CLASS}`);

  if (!visible) {
    existing?.remove();
    return;
  }
  if (existing) return;

  const badge = document.createElement("div");
  badge.className = BADGE_CLASS;
  badge.innerHTML = '<span class="live-dot" aria-hidden="true"></span><span>En vivo</span>';
  container.appendChild(badge);
};
