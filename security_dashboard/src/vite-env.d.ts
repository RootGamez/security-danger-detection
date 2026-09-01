/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del backend de visión, sin barra final. */
  readonly VITE_API_BASE_URL?: string;
  /** Nombre mostrado en la cabecera. */
  readonly VITE_APP_NAME?: string;
  /** Timeout (ms) del sondeo GET /health. */
  readonly VITE_HEALTH_TIMEOUT_MS?: string;
  /** Umbral de confianza por defecto (0.05 – 0.95). */
  readonly VITE_DEFAULT_CONFIDENCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
