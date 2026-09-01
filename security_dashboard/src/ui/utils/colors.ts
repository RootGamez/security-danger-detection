/**
 * Codificación de color por clase detectada.
 * Fuente única de verdad para cajas, tarjetas de resultados, pastillas del
 * historial y toasts, de modo que una clase tenga siempre el mismo color.
 */

export type Severity = "danger" | "warning" | "info" | "neutral";

type ClassStyle = {
  /** Color de trazo/acento. Todos superan 3:1 sobre las superficies oscuras. */
  color: string;
  severity: Severity;
};

const CLASS_STYLES: Record<string, ClassStyle> = {
  person: { color: "#34d399", severity: "neutral" }, // emerald-400
  knife: { color: "#fb7185", severity: "danger" }, // rose-400
  gun: { color: "#fb7185", severity: "danger" },
  pistol: { color: "#fb7185", severity: "danger" },
  scissors: { color: "#f87171", severity: "danger" }, // red-400
  backpack: { color: "#fbbf24", severity: "warning" }, // amber-400
  suitcase: { color: "#fb923c", severity: "warning" }, // orange-400
  handbag: { color: "#fdba74", severity: "warning" }, // orange-300
  "cell phone": { color: "#60a5fa", severity: "info" }, // blue-400
  laptop: { color: "#818cf8", severity: "info" }, // indigo-400
  dog: { color: "#a3e635", severity: "warning" }, // lime-400
  car: { color: "#22d3ee", severity: "info" }, // cyan-400
  motorcycle: { color: "#2dd4bf", severity: "info" }, // teal-400
  bicycle: { color: "#5eead4", severity: "info" }, // teal-300
};

const FALLBACK: ClassStyle = { color: "#94a3b8", severity: "neutral" }; // slate-400

const styleFor = (className: string): ClassStyle =>
  CLASS_STYLES[className.toLowerCase()] ?? FALLBACK;

/** Color hexadecimal para una clase de detección. */
export const colorForClass = (className: string): string => styleFor(className).color;

/** Severidad usada para elegir la variante del toast y del badge. */
export const severityForClass = (className: string): Severity => styleFor(className).severity;
