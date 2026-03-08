/**
 * Shared color-coding for detection classes.
 * Single source of truth used by overlay and results card components.
 */

const CLASS_COLORS: Record<string, string> = {
  person:       "#34d399",   // emerald-400
  knife:        "#f87171",   // red-400
  backpack:     "#fbbf24",   // amber-400
  suitcase:     "#fb923c",   // orange-400
  "cell phone": "#60a5fa",   // blue-400
  dog:          "#a3e635",   // lime-400
};

/** Returns a hex color for the given detection class label. */
export const colorForClass = (cls: string): string =>
  CLASS_COLORS[cls.toLowerCase()] ?? "#34d399";
