import type { UIRefs } from "../refs";

export const setStatus = (refs: UIRefs, text: string, loading = false) => {
  refs.statusText.textContent = text;
  refs.loader.classList.toggle("hidden", !loading);
};
