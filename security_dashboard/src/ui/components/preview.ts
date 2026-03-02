import type { UIRefs } from "../refs";

/**
 * Hides all media elements and clears the overlay.
 * Typically called before switching to a new media source.
 */
export const resetPreview = (refs: UIRefs): void => {
  refs.previewVideo.classList.add("hidden");
  refs.previewVideo.src = "";
  refs.webcamCanvas.classList.add("hidden");
  refs.previewImg.classList.add("hidden");
  refs.previewImg.src = "";
  refs.overlayLayer.innerHTML = "";
  refs.previewContainer.querySelector("#preview-placeholder")?.classList.add("hidden");
};

export const showPreview = (refs: UIRefs, file: File) => {
  const url = URL.createObjectURL(file);
  refs.webcamCanvas.classList.add("hidden");
  refs.previewVideo.classList.add("hidden");
  refs.previewVideo.src = "";
  refs.previewImg.src = url;
  refs.previewImg.classList.remove("hidden");
  refs.previewContainer.querySelector("span")?.classList.add("hidden");
  refs.overlayLayer.innerHTML = "";
};

export const showVideoPreview = (refs: UIRefs, file: File): string => {
  const url = URL.createObjectURL(file);
  refs.webcamCanvas.classList.add("hidden");
  refs.previewImg.classList.add("hidden");
  refs.previewImg.src = "";
  refs.previewVideo.src = url;
  refs.previewVideo.classList.remove("hidden");
  refs.previewContainer.querySelector("span")?.classList.add("hidden");
  refs.overlayLayer.innerHTML = "";
  return url;
};
