/**
 * Shared color-coding for detection classes.
 * Single source of truth used by overlay and results card components.
 */

const CLASS_COLORS: Record<string, string> = {
  fire: "#f87171",
  smoke: "#94a3b8",
  person: "#34d399",
};

/** Returns a hex color for the given detection class label. */
export const colorForClass = (cls: string): string =>
  CLASS_COLORS[cls.toLowerCase()] ?? "#34d399";
