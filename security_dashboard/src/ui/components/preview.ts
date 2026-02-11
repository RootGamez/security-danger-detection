import type { UIRefs } from "../types";

export const showPreview = (refs: UIRefs, file: File) => {
  const url = URL.createObjectURL(file);
  refs.previewImg.src = url;
  refs.previewImg.classList.remove("hidden");
  refs.previewContainer.querySelector("span")?.classList.add("hidden");
  refs.overlayLayer.innerHTML = "";
};
