/**
 * @deprecated Import directly from `./refs` and specific component files.
 * Kept as a backward-compatible barrel export.
 */
export { mountApp } from "./refs";
export type { UIRefs } from "./refs";
export { setStatus } from "./components/status";
export { showPreview, showVideoPreview, resetPreview } from "./components/preview";
export { drawOverlayBoxes, drawOverlayBoxesOnVideo, drawOverlayBoxesOnCanvas } from "./components/overlay";
export { renderDetections } from "./components/results";
