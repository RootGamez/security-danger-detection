/**
 * Tipos de archivo admitidos y clasificación de entrada.
 *
 * La estrategia es deliberadamente permisiva: se acepta cualquier `type`
 * MIME `image/*` o `video/*`, y además una lista amplia de extensiones para
 * los formatos que el navegador reporta con MIME vacío o genérico
 * (`application/octet-stream`), muy habitual en .mkv, .avi o .ts.
 */

export type MediaKind = "image" | "video" | "unknown";

export const VIDEO_EXTENSIONS = [
  ".mp4", ".m4v", ".mov", ".avi", ".mkv", ".webm", ".mpeg", ".mpg", ".m2v",
  ".wmv", ".flv", ".f4v", ".3gp", ".3g2", ".ogv", ".ogm", ".ts", ".mts",
  ".m2ts", ".mxf", ".asf", ".rm", ".rmvb", ".divx", ".vob", ".dav",
] as const;

export const IMAGE_EXTENSIONS = [
  ".jpg", ".jpeg", ".jpe", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff",
  ".avif", ".heic", ".heif", ".jfif", ".pgm", ".ppm", ".pbm", ".dib",
] as const;

/** Valor para el atributo `accept` de los `<input type="file">`. */
export const FILE_ACCEPT = [
  "image/*",
  "video/*",
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
].join(",");

const VIDEO_EXT_SET = new Set<string>(VIDEO_EXTENSIONS);
const IMAGE_EXT_SET = new Set<string>(IMAGE_EXTENSIONS);

/** Extensión en minúsculas incluyendo el punto, o "" si no tiene. */
export const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
};

/**
 * Decide si un archivo es imagen o video.
 * El MIME manda; la extensión es el plan B para MIME ausente o genérico.
 */
export const classifyFile = (file: File): MediaKind => {
  const mime = (file.type || "").toLowerCase();
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";

  const ext = extensionOf(file.name);
  if (VIDEO_EXT_SET.has(ext)) return "video";
  if (IMAGE_EXT_SET.has(ext)) return "image";
  return "unknown";
};

/** Etiqueta corta legible del formato, para tarjetas y el historial. */
export const formatLabel = (file: File): string => {
  const ext = extensionOf(file.name).replace(".", "");
  return ext ? ext.toUpperCase() : "ARCHIVO";
};

/** Tamaño legible: 1.2 MB, 340 KB… */
export const humanSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exp;
  return `${value >= 10 || exp === 0 ? Math.round(value) : value.toFixed(1)} ${units[exp]}`;
};
