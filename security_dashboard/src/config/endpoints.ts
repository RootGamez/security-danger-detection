/**
 * Construcción de endpoints.
 *
 * Son funciones y no constantes a propósito: la URL base puede cambiar en
 * caliente desde el panel "Backend", así que cada llamada debe resolverse en
 * el momento de la petición y no al importar el módulo.
 */

import { getApiBaseUrl } from "../core/backend.store";

const at = (path: string): string => `${getApiBaseUrl()}${path}`;

export const healthUrl = (): string => at("/health");

export const predictImageUrl = (): string => at("/predict");
export const predictVideoUrl = (): string => at("/predict/video");
export const predictYoutubeUrl = (): string => at("/predict/youtube");
export const predictWebcamUrl = (): string => at("/predict/webcam");

export const cameraAddUrl = (): string => at("/camera/add");
export const cameraStreamUrl = (camId: string): string =>
  at(`/camera/${encodeURIComponent(camId)}/stream`);
export const cameraEventsUrl = (camId: string): string =>
  at(`/camera/${encodeURIComponent(camId)}/events`);

/**
 * Cabeceras comunes a toda petición.
 *
 * `bypass-tunnel-reminder` salta la página intersticial que localtunnel
 * muestra en la primera visita; es inofensiva contra cualquier otro backend.
 */
export const commonHeaders = (): Record<string, string> => ({
  "bypass-tunnel-reminder": "true",
});
