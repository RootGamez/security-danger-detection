/**
 * Lectura y saneado de variables de entorno.
 *
 * La URL del backend vive en `.env` (VITE_API_BASE_URL) para no tener que
 * tocar código fuente. Como el túnel de Colab rota en cada sesión, este módulo
 * sólo aporta el *valor por defecto*: `core/backend.store.ts` superpone encima
 * un override en runtime (query string + localStorage).
 */

const FALLBACK_BASE_URL = "http://localhost:8000";

/** Quita barras finales para que la concatenación de rutas sea predecible. */
export const normalizeBaseUrl = (raw: string): string => raw.trim().replace(/\/+$/, "");

const readNumber = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** URL base declarada en `.env`. Es el valor al que vuelve "Restablecer". */
export const ENV_API_BASE_URL =
  normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL ?? FALLBACK_BASE_URL) || FALLBACK_BASE_URL;

export const APP_NAME = import.meta.env.VITE_APP_NAME?.trim() || "SecureVision";

export const HEALTH_TIMEOUT_MS = readNumber(import.meta.env.VITE_HEALTH_TIMEOUT_MS, 6_000);

export const MIN_CONFIDENCE = 0.05;
export const MAX_CONFIDENCE = 0.95;

/** Umbral de confianza por defecto, acotado al rango admitido. */
export const DEFAULT_CONFIDENCE = Math.min(
  MAX_CONFIDENCE,
  Math.max(MIN_CONFIDENCE, readNumber(import.meta.env.VITE_DEFAULT_CONFIDENCE, 0.35)),
);
