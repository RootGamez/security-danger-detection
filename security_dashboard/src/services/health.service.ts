/**
 * Sondeo de salud del backend.
 * Alimenta el indicador de conexión de la barra superior.
 */

import { HEALTH_TIMEOUT_MS } from "../config/env";
import { commonHeaders, healthUrl } from "../config/endpoints";

export type HealthStatus = "unknown" | "checking" | "online" | "offline";

export type HealthResult = {
  status: Extract<HealthStatus, "online" | "offline">;
  /** Dispositivo de inferencia reportado por el backend (cuda / cpu). */
  device?: string;
  /** Latencia de ida y vuelta en ms. */
  latencyMs?: number;
  /** Motivo del fallo, legible para el usuario. */
  error?: string;
};

/**
 * Llama a `GET /health` con timeout. Nunca lanza: los fallos vuelven como
 * `status: "offline"` con un mensaje ya redactado para mostrar en la UI.
 *
 * @param externalSignal permite al llamador cancelar un sondeo que ya no le
 *   interesa (por ejemplo, porque la URL ha cambiado mientras tanto).
 */
export const checkHealth = async (externalSignal?: AbortSignal): Promise<HealthResult> => {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  externalSignal?.addEventListener("abort", abort, { once: true });

  const timer = setTimeout(abort, HEALTH_TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const response = await fetch(healthUrl(), {
      method: "GET",
      headers: commonHeaders(),
      signal: controller.signal,
      cache: "no-store",
    });

    const latencyMs = Math.round(performance.now() - startedAt);

    if (!response.ok) {
      return { status: "offline", latencyMs, error: `El backend respondió ${response.status}` };
    }

    const data = (await response.json().catch(() => ({}))) as { device?: string };
    return { status: "online", device: data.device, latencyMs };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return {
      status: "offline",
      error: aborted
        ? `Sin respuesta en ${HEALTH_TIMEOUT_MS} ms`
        : "No se pudo conectar. Revisa la URL y que el túnel siga activo.",
    };
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abort);
  }
};
