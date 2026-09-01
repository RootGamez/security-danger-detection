/**
 * Store de la URL del backend.
 *
 * Precedencia (de mayor a menor):
 *   1. `?api=` en la query string — permite compartir un enlace ya apuntado
 *      al túnel activo. Al leerse se persiste y se limpia de la barra.
 *   2. `localStorage` — lo que el usuario escribió en el panel "Backend".
 *   3. `VITE_API_BASE_URL` de `.env`.
 *
 * Los suscriptores se notifican en cada cambio para que la UI (indicador de
 * conexión, panel de ajustes) se repinte sin recargar la página.
 */

import { ENV_API_BASE_URL, normalizeBaseUrl } from "../config/env";

const STORAGE_KEY = "securevision.apiBaseUrl";
const QUERY_PARAM = "api";

export type BackendOrigin = "env" | "override";

export type BackendConfig = {
  /** URL base efectiva, sin barra final. */
  baseUrl: string;
  /** De dónde salió el valor actual. */
  origin: BackendOrigin;
  /** Valor declarado en `.env`, para poder ofrecer "Restablecer". */
  envUrl: string;
};

// ── Validación ─────────────────────────────────────────────────────────────

/** Acepta sólo URLs http(s) absolutas y con host. */
export const isValidBackendUrl = (raw: string): boolean => {
  try {
    const url = new URL(raw.trim());
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
  } catch {
    return false;
  }
};

// ── Acceso a localStorage (tolerante a modo privado / storage bloqueado) ────

const readStored = (): string | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && isValidBackendUrl(value) ? normalizeBaseUrl(value) : null;
  } catch {
    return null;
  }
};

const writeStored = (value: string | null): void => {
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage no disponible: el override vive sólo en memoria */
  }
};

// ── Bootstrap desde la query string ────────────────────────────────────────

/**
 * Lee `?api=...`, lo persiste y lo retira de la URL visible para que un
 * refresco no reintroduzca un valor obsoleto.
 */
const consumeQueryOverride = (): string | null => {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(QUERY_PARAM);
    if (!raw || !isValidBackendUrl(raw)) return null;

    const normalized = normalizeBaseUrl(raw);
    writeStored(normalized);

    params.delete(QUERY_PARAM);
    const query = params.toString();
    const cleaned = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", cleaned);

    return normalized;
  } catch {
    return null;
  }
};

// ── Estado ─────────────────────────────────────────────────────────────────

let _override: string | null = consumeQueryOverride() ?? readStored();

const _listeners = new Set<(config: BackendConfig) => void>();

const snapshot = (): BackendConfig => ({
  baseUrl: _override ?? ENV_API_BASE_URL,
  origin: _override ? "override" : "env",
  envUrl: ENV_API_BASE_URL,
});

const notify = (): void => {
  const config = snapshot();
  _listeners.forEach((listener) => listener(config));
};

// ── API pública ────────────────────────────────────────────────────────────

/** URL base efectiva. Léela en cada petición: puede cambiar en caliente. */
export const getApiBaseUrl = (): string => _override ?? ENV_API_BASE_URL;

export const getBackendConfig = (): BackendConfig => snapshot();

/**
 * Fija un override en runtime.
 * @returns `false` si la URL no es http(s) válida (el store no se toca).
 */
export const setApiBaseUrl = (raw: string): boolean => {
  if (!isValidBackendUrl(raw)) return false;

  const normalized = normalizeBaseUrl(raw);
  if (normalized === _override) return true;

  _override = normalized;
  writeStored(normalized);
  notify();
  return true;
};

/** Descarta el override y vuelve al valor de `.env`. */
export const resetApiBaseUrl = (): void => {
  if (_override === null) return;
  _override = null;
  writeStored(null);
  notify();
};

/** Suscribe a cambios. Devuelve la función para desuscribir. */
export const onBackendChange = (listener: (config: BackendConfig) => void): (() => void) => {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
};
