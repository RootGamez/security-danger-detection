/**
 * Capa de cajas delimitadoras sobre la vista previa.
 *
 * Las tres variantes anteriores (imagen, video, canvas) eran el mismo cálculo
 * repetido; aquí queda una sola función que recibe el elemento y su tamaño
 * intrínseco, y tres envoltorios finos que lo resuelven por tipo de medio.
 *
 * Nota: cuando el backend ya devuelve el fotograma anotado (`frame` en base64)
 * esta capa no se usa — sólo hace falta para dibujar sobre medios locales.
 */

import type { DetectionPayload } from "../../types/domain";
import { colorForClass } from "../utils/colors";
import { asPercent, capitalize } from "../utils/format";
import type { UIRefs } from "../refs";

type Geometry = {
  /** Escala entre las coordenadas del modelo y las del elemento pintado. */
  scaleX: number;
  scaleY: number;
  /** Desplazamiento del medio dentro del contenedor (letterboxing). */
  offsetX: number;
  offsetY: number;
};

const geometryFor = (
  container: HTMLElement,
  media: HTMLElement,
  intrinsicWidth: number,
  intrinsicHeight: number,
): Geometry | null => {
  if (intrinsicWidth <= 0 || intrinsicHeight <= 0) return null;

  const containerRect = container.getBoundingClientRect();
  const mediaRect = media.getBoundingClientRect();
  if (mediaRect.width === 0 || mediaRect.height === 0) return null;

  return {
    scaleX: mediaRect.width / intrinsicWidth,
    scaleY: mediaRect.height / intrinsicHeight,
    offsetX: mediaRect.left - containerRect.left,
    offsetY: mediaRect.top - containerRect.top,
  };
};

const buildBox = (detection: DetectionPayload, geometry: Geometry): HTMLDivElement => {
  const [x1, y1, x2, y2] = detection.bbox;
  const color = colorForClass(detection.class);

  const box = document.createElement("div");
  box.className = "overlay-box";
  box.style.setProperty("--box-color", color);
  box.style.left = `${geometry.offsetX + x1 * geometry.scaleX}px`;
  box.style.top = `${geometry.offsetY + y1 * geometry.scaleY}px`;
  box.style.width = `${Math.max(x2 - x1, 1) * geometry.scaleX}px`;
  box.style.height = `${Math.max(y2 - y1, 1) * geometry.scaleY}px`;

  const label = document.createElement("span");
  label.className = "overlay-label";
  label.textContent = `${capitalize(detection.class)} ${asPercent(detection.confidence)}`;
  box.appendChild(label);

  return box;
};

const paint = (
  refs: UIRefs,
  media: HTMLElement,
  intrinsicWidth: number,
  intrinsicHeight: number,
  detections: DetectionPayload[],
): void => {
  refs.overlayLayer.innerHTML = "";
  if (detections.length === 0) return;

  const geometry = geometryFor(refs.previewContainer, media, intrinsicWidth, intrinsicHeight);
  if (!geometry) return;

  const fragment = document.createDocumentFragment();
  detections.forEach((detection) => fragment.appendChild(buildBox(detection, geometry)));
  refs.overlayLayer.appendChild(fragment);
};

export const drawOverlayOnImage = (refs: UIRefs, detections: DetectionPayload[]): void =>
  paint(refs, refs.previewImg, refs.previewImg.naturalWidth, refs.previewImg.naturalHeight, detections);

export const drawOverlayOnVideo = (refs: UIRefs, detections: DetectionPayload[]): void =>
  paint(refs, refs.previewVideo, refs.previewVideo.videoWidth, refs.previewVideo.videoHeight, detections);

export const drawOverlayOnCanvas = (refs: UIRefs, detections: DetectionPayload[]): void =>
  paint(refs, refs.webcamCanvas, refs.webcamCanvas.width, refs.webcamCanvas.height, detections);

export const clearOverlay = (refs: UIRefs): void => {
  refs.overlayLayer.innerHTML = "";
};
