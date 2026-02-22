import type { UIRefs } from "../types";

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
