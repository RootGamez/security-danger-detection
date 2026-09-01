/**
 * Pestañas de selección de fuente (archivo / cámara / YouTube / URL).
 *
 * Implementa el patrón ARIA de tablist con navegación por flechas, Home y
 * End, y roving tabindex, según la pauta `keyboard-nav`.
 */

import type { UIRefs } from "../refs";

export const initSourceTabs = (refs: UIRefs): void => {
  const { sourceTabs, sourcePanels } = refs;

  const activate = (target: HTMLButtonElement, moveFocus = true): void => {
    const id = target.dataset.sourceTab;

    sourceTabs.forEach((tab) => {
      const selected = tab === target;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    sourcePanels.forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.sourcePanel !== id);
    });

    if (moveFocus) target.focus();
  };

  sourceTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(tab, false));

    tab.addEventListener("keydown", (event) => {
      const lastIndex = sourceTabs.length - 1;
      let nextIndex: number | null = null;

      switch (event.key) {
        case "ArrowRight":
          nextIndex = index === lastIndex ? 0 : index + 1;
          break;
        case "ArrowLeft":
          nextIndex = index === 0 ? lastIndex : index - 1;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = lastIndex;
          break;
        default:
          return;
      }

      event.preventDefault();
      activate(sourceTabs[nextIndex], true);
    });
  });
};
