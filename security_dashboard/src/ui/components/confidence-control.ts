/**
 * Deslizador del umbral de confianza de la barra superior.
 *
 * El valor viaja al backend como `?conf=` en cada petición, así que cambiarlo
 * afecta al siguiente análisis sin recargar nada: es el control que más se usa
 * al comparar dos modelos entrenados en Colab.
 */

import { getConfidence, onConfidenceChange, setConfidence } from "../../core/settings.store";
import type { UIRefs } from "../refs";

const toPercent = (confidence: number): number => Math.round(confidence * 100);

export const initConfidenceControl = (refs: UIRefs): void => {
  const render = (confidence: number): void => {
    const percent = toPercent(confidence);
    refs.confSlider.value = String(percent);
    refs.confValue.textContent = `${percent}%`;
    refs.confSlider.setAttribute("aria-valuetext", `${percent} por ciento`);
    // Alimenta el degradado de relleno de la pista.
    refs.confSlider.style.setProperty("--range-progress", `${((percent - 5) / 90) * 100}%`);
  };

  refs.confSlider.addEventListener("input", () => {
    render(setConfidence(Number(refs.confSlider.value) / 100));
  });

  onConfidenceChange(render);
  render(getConfidence());
};
