/**
 * Set de iconos SVG (trazo, estilo Lucide).
 *
 * Un único set con el mismo grosor de trazo y la misma caja 24×24 para toda
 * la app. Sustituye a los emoji, que dependen de la fuente del sistema y no
 * se pueden colorear con los tokens del tema.
 */

export type IconName =
  | "shield"
  | "upload"
  | "folder"
  | "camera"
  | "camera-off"
  | "video"
  | "youtube"
  | "link"
  | "grid"
  | "history"
  | "trash"
  | "close"
  | "server"
  | "check"
  | "alert"
  | "stop"
  | "refresh"
  | "image"
  | "film"
  | "plus"
  | "cpu"
  | "activity"
  | "target"
  | "sliders"
  | "search"
  | "inbox"
  | "external"
  | "user"
  | "package"
  | "smartphone"
  | "dog"
  | "knife";

/** Contenido interior de cada icono, en un viewBox 0 0 24 24. */
const PATHS: Record<IconName, string> = {
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  upload:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  folder:
    '<path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2z"/>',
  camera:
    '<circle cx="12" cy="12" r="3"/><path d="M20.19 10.93c.2.55.31 1.14.31 1.74 0 3.31-2.69 6-6 6H9.5a6 6 0 1 1 0-12h5a6 6 0 0 1 5.69 4.26z"/>',
  "camera-off":
    '<path d="m2 2 20 20"/><path d="M9.5 6.5h5a6 6 0 0 1 4.5 9.96"/><path d="M6.2 6.7A6 6 0 0 0 9.5 18.5h5"/>',
  video: '<path d="m22 8-6 4 6 4z"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  youtube:
    '<path d="M22 8.6a3 3 0 0 0-2.1-2.1C18 6 12 6 12 6s-6 0-7.9.5A3 3 0 0 0 2 8.6 31 31 0 0 0 2 12a31 31 0 0 0 .1 3.4 3 3 0 0 0 2 2.1C6 18 12 18 12 18s6 0 7.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.1-3.4z"/><path d="m10 15 5-3-5-3z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  history: '<path d="M12 8v4l3 2"/><path d="M3.05 11a9 9 0 1 1 .5 4"/><path d="M3 16H1v-4"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  server:
    '<rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><path d="M6 6.5h.01"/><path d="M6 17.5h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert:
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  refresh:
    '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.6-4.6a2 2 0 0 0-2.8 0L3 21"/>',
  film: '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 3v18"/><path d="M17 3v18"/><path d="M2 9h5"/><path d="M2 15h5"/><path d="M17 9h5"/><path d="M17 15h5"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4"/><path d="M15 2v4"/><path d="M9 18v4"/><path d="M15 18v4"/><path d="M2 9h4"/><path d="M2 15h4"/><path d="M18 9h4"/><path d="M18 15h4"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  sliders:
    '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  inbox:
    '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  package:
    '<path d="m21 8-9-5-9 5 9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  smartphone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  dog: '<path d="M10 5.2 8 3 5 4v5l-2 3 2 2v5h5l2 2 2-2h5v-5l2-2-2-3V4l-3-1-2 2.2z"/><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16h4"/>',
  knife: '<path d="M18 2 8 12l4 4L22 6z"/><path d="m12 16-8 6-2-2 6-8"/>',
};

export type IconOptions = {
  /** Tamaño en px del lado del cuadrado. Por defecto 16. */
  size?: number;
  /** Clases CSS extra para el `<svg>`. */
  className?: string;
  /** Grosor del trazo. Por defecto 1.75. */
  strokeWidth?: number;
};

/**
 * Devuelve el markup de un icono.
 *
 * Siempre `aria-hidden`: los iconos son decorativos y el nombre accesible lo
 * aporta el texto del botón o su `aria-label`.
 */
export const icon = (name: IconName, options: IconOptions = {}): string => {
  const { size = 16, className = "", strokeWidth = 1.75 } = options;
  const classes = className ? `icon ${className}` : "icon";

  return [
    `<svg class="${classes}" width="${size}" height="${size}" viewBox="0 0 24 24"`,
    ` fill="none" stroke="currentColor" stroke-width="${strokeWidth}"`,
    ` stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">`,
    PATHS[name],
    `</svg>`,
  ].join("");
};

/** Icono representativo de cada clase detectada, para pastillas y toasts. */
const CLASS_ICONS: Record<string, IconName> = {
  person: "user",
  knife: "knife",
  backpack: "package",
  suitcase: "package",
  "cell phone": "smartphone",
  dog: "dog",
};

export const iconForClass = (className: string): IconName =>
  CLASS_ICONS[className.toLowerCase()] ?? "target";
