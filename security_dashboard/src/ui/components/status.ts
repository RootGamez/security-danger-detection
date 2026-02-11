import type { UIRefs } from "../types";

export const setStatus = (refs: UIRefs, text: string, loading = false) => {
  refs.statusText.textContent = text;
  refs.loader.classList.toggle("hidden", !loading);
};
