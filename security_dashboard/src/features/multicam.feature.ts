/**
 * Panel multicámara: varias fuentes analizándose en paralelo.
 *
 * Cada fuente añade una tarjeta a la rejilla y una fila al lateral, y se
 * queda con su propio `AbortController` para poder cerrarse por separado.
 * Al activarse, la rejilla reemplaza a la vista previa de fuente única.
 */

import { classifyFile, formatLabel } from "../config/media";
import {
  addCameraSource,
  mjpegStreamUrl,
  streamCameraEvents,
  streamVideoDetections,
  streamYoutubeDetections,
  uploadAndPredict,
} from "../services/detection.api";
import type { SafetyAlert } from "../types/domain";
import { showAlertToasts } from "../ui/components/alert-toast";
import { createCameraCard, type CameraCardController } from "../ui/components/camera-card";
import { clearPreview } from "../ui/components/preview";
import { renderMultiCamNotice, resetResults } from "../ui/components/results";
import { setStageHeader, setStatus } from "../ui/components/status";
import { countLabel } from "../ui/utils/format";
import type { IconName } from "../ui/utils/icons";
import type { FeatureContext } from "./context";

export type MultiCamHandlers = {
  addFromYoutube: (url: string) => void;
  addFromUrl: (source: string) => void;
  addFromFile: (file: File) => void;
  stopAll: () => void;
};

/** Etiqueta la alerta con la cámara de origen antes de mostrar el toast. */
const toastFor = (alerts: SafetyAlert[] | undefined, cameraTitle: string): number =>
  showAlertToasts(alerts?.map((alert) => ({ ...alert, cameraId: cameraTitle })));

export const createMultiCamHandler = (ctx: FeatureContext): MultiCamHandlers => {
  const { refs, state, stats } = ctx;
  let nextIndex = 1;

  /** Última cuenta de detecciones por cámara, para agregar el KPI global. */
  const detectionsByCamera = new Map<string, number>();

  /**
   * Suma las detecciones vigentes de todas las cámaras y contabiliza el
   * fotograma. Así las tarjetas KPI siguen significando algo en modo rejilla.
   */
  const recordCameraFrame = (camId: string, detections: number, alerts: number): void => {
    detectionsByCamera.set(camId, detections);
    let total = 0;
    detectionsByCamera.forEach((count) => {
      total += count;
    });
    stats.recordFrame(total, alerts);
  };

  // ── Visibilidad de la rejilla ────────────────────────────────────────────

  const syncGridVisibility = (): void => {
    const active = state.cameras.size > 0;
    state.multiCamActive = active;

    refs.previewContainer.classList.toggle("hidden", active);
    refs.multiCamGrid.classList.toggle("hidden", !active);
    refs.multiCamStopBtn.classList.toggle("hidden", !active);
    refs.multiCamCount.textContent = countLabel(state.cameras.size, "activa", "activas");
    refs.multiCamGrid.dataset.count = String(state.cameras.size);

    if (active) {
      setStageHeader(
        refs,
        "Panel multicámara",
        `${countLabel(state.cameras.size, "fuente", "fuentes")} analizándose en paralelo`,
      );
    }
  };

  const removeCamera = (camId: string): void => {
    const slot = state.cameras.get(camId);
    if (!slot) return;

    slot.controller.abort();
    slot.card.destroy();
    state.cameras.delete(camId);
    detectionsByCamera.delete(camId);

    if (state.cameras.size === 0) {
      clearPreview(refs);
      stats.reset();
      resetResults(refs);
      setStageHeader(refs, "Sin fuente activa", "Elige un archivo, una cámara o una URL para empezar.");
      setStatus(refs, "Panel multicámara detenido", false);
    }
    syncGridVisibility();
  };

  /**
   * Crea la tarjeta y la deja montada. El `AbortController` se registra
   * después, cuando la feature concreta abre su stream.
   */
  const mountCard = (source: string, iconName: IconName): CameraCardController => {
    // La primera cámara desaloja la vista de fuente única y reinicia lo que
    // quedara en pantalla de la sesión anterior.
    if (state.cameras.size === 0) {
      ctx.stopStream();
      stats.reset();
      renderMultiCamNotice(refs);
    }

    const camId = `cam-${nextIndex}`;
    const card = createCameraCard({
      camId,
      title: `Cámara ${nextIndex}`,
      source,
      iconName,
      onRemove: () => removeCamera(camId),
    });
    nextIndex++;

    refs.multiCamGrid.appendChild(card.card);
    refs.multiCamList.appendChild(card.listItem);
    return card;
  };

  const register = (card: CameraCardController, controller: AbortController): void => {
    state.cameras.set(card.camId, { controller, card });
    syncGridVisibility();
  };

  // ── Altas por tipo de fuente ─────────────────────────────────────────────

  const addFromYoutube = (url: string): void => {
    const normalized = url.trim();
    if (!normalized) {
      setStatus(refs, "Escribe una URL de YouTube", false);
      return;
    }

    const card = mountCard(normalized, "youtube");
    setStatus(refs, `Conectando ${card.title}…`, true);

    const controller = streamYoutubeDetections(
      normalized,
      (frame) => {
        card.setFrame(frame.frame);
        card.setState("live");
        recordCameraFrame(
          card.camId,
          Array.isArray(frame.detections) ? frame.detections.length : frame.detections,
          toastFor(frame.alerts, card.title),
        );
      },
      () => {
        card.setState("done");
        setStatus(refs, `${card.title} finalizada`, false);
      },
      (err) => {
        card.setState("error", err.message);
        setStatus(refs, `Error en ${card.title}: ${err.message}`, false);
      },
    );

    register(card, controller);
  };

  const addFromUrl = (source: string): void => {
    const normalized = source.trim();
    if (!normalized) {
      setStatus(refs, "Escribe una URL de cámara", false);
      return;
    }

    const card = mountCard(normalized, "link");
    setStatus(refs, `Conectando ${card.title}…`, true);

    // Se registra ya con un controller propio: si el alta falla o el usuario
    // cierra la tarjeta antes de tiempo, `abort()` corta la petición en curso.
    const controller = new AbortController();
    register(card, controller);

    void (async () => {
      try {
        await addCameraSource(card.camId, normalized);
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo conectar la cámara";
        card.setState("error", message);
        setStatus(refs, `Error en ${card.title}: ${message}`, false);
        return;
      }

      if (controller.signal.aborted) return;

      // El video llega como MJPEG por <img>; los eventos, por SSE aparte.
      card.setStreamUrl(mjpegStreamUrl(card.camId));
      card.setState("live");

      const events = streamCameraEvents(
        card.camId,
        (payload) => {
          card.setState("live");
          recordCameraFrame(
            card.camId,
            payload.detections?.length ?? 0,
            toastFor(payload.alerts, card.title),
          );
        },
        () => card.setState("done"),
        (err) => card.setState("error", err.message),
      );

      // Cerrar la tarjeta debe cortar también el stream de eventos.
      controller.signal.addEventListener("abort", () => events.abort(), { once: true });
    })();
  };

  const addFromFile = (file: File): void => {
    const kind = classifyFile(file);
    if (kind === "unknown") {
      setStatus(refs, `Formato no reconocido: ${file.name}`, false);
      return;
    }

    const card = mountCard(`${formatLabel(file)} · ${file.name}`, kind === "image" ? "image" : "film");
    setStatus(refs, `Procesando ${card.title}…`, true);

    if (kind === "image") {
      const controller = new AbortController();
      register(card, controller);

      void (async () => {
        try {
          const result = await uploadAndPredict(file);
          if (controller.signal.aborted) return;

          card.setFrame(result.frame);
          card.setState("done", "Completada");
          toastFor(result.alerts, card.title);
          setStatus(refs, `${card.title} completada`, false);
        } catch (err) {
          const message = err instanceof Error ? err.message : "No se pudo analizar la imagen";
          card.setState("error", message);
          setStatus(refs, `Error en ${card.title}: ${message}`, false);
        }
      })();
      return;
    }

    const controller = streamVideoDetections(
      file,
      (frame) => {
        card.setFrame(frame.frame);
        card.setState("live");
        recordCameraFrame(
          card.camId,
          Array.isArray(frame.detections) ? frame.detections.length : frame.detections,
          toastFor(frame.alerts, card.title),
        );
      },
      () => {
        card.setState("done");
        setStatus(refs, `${card.title} finalizada`, false);
      },
      (err) => {
        card.setState("error", err.message);
        setStatus(refs, `Error en ${card.title}: ${err.message}`, false);
      },
    );

    register(card, controller);
  };

  const stopAll = (): void => {
    state.cameras.forEach((slot) => {
      slot.controller.abort();
      slot.card.destroy();
    });
    state.cameras.clear();
    detectionsByCamera.clear();
    nextIndex = 1;
    stats.reset();
    resetResults(refs);

    refs.multiCamGrid.replaceChildren();
    refs.multiCamList.replaceChildren();
    syncGridVisibility();

    clearPreview(refs);
    setStageHeader(refs, "Sin fuente activa", "Elige un archivo, una cámara o una URL para empezar.");
    setStatus(refs, "Panel multicámara detenido", false);
  };

  syncGridVisibility();

  return { addFromYoutube, addFromUrl, addFromFile, stopAll };
};
