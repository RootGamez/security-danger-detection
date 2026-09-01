/**
 * Gestión de los elementos multimedia del escenario.
 *
 * Sólo uno de `<img>` / `<video>` / `<canvas>` es visible a la vez. Las URLs
 * de objeto creadas con `URL.createObjectURL` se liberan al cambiar de fuente
 * para no filtrar memoria entre análisis.
 */

import type { UIRefs } from "../refs";

let _objectUrl: string | null = null;

const releaseObjectUrl = (): void => {
  if (_objectUrl) {
    URL.revokeObjectURL(_objectUrl);
    _objectUrl = null;
  }
};

const trackObjectUrl = (file: File): string => {
  releaseObjectUrl();
  _objectUrl = URL.createObjectURL(file);
  return _objectUrl;
};

/** Oculta todo el contenido multimedia y limpia la capa de cajas. */
export const resetPreview = (refs: UIRefs): void => {
  releaseObjectUrl();

  refs.previewVideo.pause();
  refs.previewVideo.removeAttribute("src");
  refs.previewVideo.load();
  refs.previewVideo.classList.add("hidden");

  refs.webcamCanvas.classList.add("hidden");

  refs.previewImg.removeAttribute("src");
  refs.previewImg.classList.add("hidden");

  refs.overlayLayer.innerHTML = "";
  refs.previewPlaceholder.classList.add("hidden");
};

/** Vuelve al estado vacío inicial, con el marcador de posición visible. */
export const clearPreview = (refs: UIRefs): void => {
  resetPreview(refs);
  refs.previewPlaceholder.classList.remove("hidden");
};

/** Prepara el `<img>` para recibir fotogramas base64 del backend. */
export const useFrameTarget = (refs: UIRefs): void => {
  resetPreview(refs);
  refs.previewImg.classList.remove("hidden");
};

/** Pinta un fotograma JPEG en base64 llegado por SSE. */
export const paintFrame = (refs: UIRefs, base64?: string): void => {
  if (!base64) return;
  refs.previewImg.src = `data:image/jpeg;base64,${base64}`;
};

/** Muestra una imagen local (respaldo si el backend no devuelve fotograma). */
export const showImagePreview = (refs: UIRefs, file: File): void => {
  resetPreview(refs);
  refs.previewImg.src = trackObjectUrl(file);
  refs.previewImg.classList.remove("hidden");
};

/** Muestra un video local en el reproductor nativo. */
export const showVideoPreview = (refs: UIRefs, file: File): string => {
  resetPreview(refs);
  const url = trackObjectUrl(file);
  refs.previewVideo.src = url;
  refs.previewVideo.classList.remove("hidden");
  return url;
};
