/**
 * Live badge component.
 * Shown on the preview container during an active webcam/live stream.
 */

const BADGE_ID = "live-badge";

export const showLiveBadge = (container: HTMLElement, visible: boolean): void => {
  const existing = document.getElementById(BADGE_ID);

  if (!visible) {
    existing?.remove();
    return;
  }

  if (existing) return; // already mounted

  const badge = document.createElement("div");
  badge.id = BADGE_ID;
  badge.innerHTML = `<span class="live-dot"></span> EN VIVO`;
  container.appendChild(badge);
};
