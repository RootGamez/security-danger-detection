/**
 * Barra de estado y cabecera del escenario.
 */

import type { UIRefs } from "../refs";

/** Texto de la barra de estado; `loading` muestra el spinner. */
export const setStatus = (refs: UIRefs, text: string, loading = false): void => {
  refs.statusText.textContent = text;
  refs.loader.classList.toggle("hidden", !loading);
  refs.statusText.dataset.loading = String(loading);
};

/** Título y subtítulo que describen la fuente en curso. */
export const setStageHeader = (refs: UIRefs, title: string, subtitle: string): void => {
  refs.stageTitle.textContent = title;
  refs.stageSubtitle.textContent = subtitle;
};

/**
 * Muestra u oculta el botón global de "Detener análisis".
 *
 * En fuentes en vivo se deja oculto: el propio botón de cámara ya actúa como
 * interruptor y tener dos paradas juntas sólo confunde.
 */
export const setStoppable = (refs: UIRefs, stoppable: boolean): void => {
  refs.stopBtn.classList.toggle("hidden", !stoppable);
};
