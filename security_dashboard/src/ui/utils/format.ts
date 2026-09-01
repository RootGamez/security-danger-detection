/**
 * Helpers de formato y saneado para las plantillas.
 *
 * Varias cadenas que acaban en `innerHTML` vienen del usuario (nombres de
 * archivo, URLs pegadas) o del backend (`alert.type`). `escapeHtml` es
 * obligatorio antes de interpolarlas.
 */

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapa texto no confiable antes de interpolarlo en `innerHTML`. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);

/** Recorta por el centro conservando inicio y final, útil para URLs. */
export const truncateMiddle = (value: string, max = 40): string => {
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${value.slice(0, head)}…${value.slice(value.length - tail)}`;
};

/** Recorta por el final. */
export const truncateEnd = (value: string, max = 40): string =>
  value.length <= max ? value : `${value.slice(0, max - 1)}…`;

/** Confianza 0–1 como porcentaje entero: 0.876 → "88%". */
export const asPercent = (value: number, decimals = 0): string =>
  `${(value * 100).toFixed(decimals)}%`;

/** "hace 3 min", "hace 2 h", o la fecha si es de otro día. */
export const timeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "hace un momento";
  if (seconds < 3_600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86_400) return `hace ${Math.floor(seconds / 3_600)} h`;
  return date.toLocaleDateString("es", { day: "2-digit", month: "short" });
};

/** Pluraliza en español: countLabel(1, "sesión", "sesiones") → "1 sesión". */
export const countLabel = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`;

/** Capitaliza la primera letra. */
export const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

/** Formatea enteros con separador de miles del locale. */
export const formatCount = (value: number): string => value.toLocaleString("es");
