/**
 * Multicamera feature — manages parallel sources for YouTube, URLs, and files.
 */

import {
  addCameraSource,
  cameraStreamUrl,
  streamCameraEvents,
  streamYoutubeDetections,
  streamVideoDetections,
  uploadAndPredict,
} from "../services/detection.api";
import type { AppState } from "../state/app.state";
import type { DetectionPayload, SafetyAlert, VideoFramePayload } from "../types/domain";
import type { UIRefs } from "../ui/refs";
import { resetPreview } from "../ui/components/preview";
import { setStatus } from "../ui/components/status";
import { showAlertToasts } from "../ui/components/alert-toast";

export type MultiCamHandlers = {
  addFromYoutube: (url: string) => void;
  addFromUrl: (source: string) => void;
  addFromFile: (file: File) => void;
  stopAll: () => void;
};

const setMultiCamActive = (refs: UIRefs, active: boolean): void => {
  refs.previewContainer.classList.toggle("hidden", active);
  refs.multiCamGrid.classList.toggle("hidden", !active);
};

const createCameraCard = (title: string, source: string): HTMLElement => {
  const card = document.createElement("div");
  card.className = "camera-card";
  card.dataset.id = title;
  card.innerHTML = `
    <div class="camera-card-header">
      <div class="camera-title-group">
        <span class="camera-title">${title}</span>
        <span class="camera-source">${source}</span>
      </div>
      <span class="camera-status">Conectando...</span>
    </div>
    <div class="camera-feed">
      <img class="camera-stream" alt="${title}" />
    </div>
  `;
  return card;
};

const createCameraListItem = (title: string, source: string): HTMLElement => {
  const item = document.createElement("div");
  item.className = "camera-list-item";
  item.dataset.id = title;
  item.innerHTML = `
    <div>
      <p class="camera-list-title">${title}</p>
      <p class="camera-list-sub">${source}</p>
    </div>
    <span class="camera-list-pill">Activo</span>
  `;
  return item;
};

const updateCameraStatus = (card: HTMLElement): void => {
  const statusEl = card.querySelector<HTMLElement>(".camera-status");
  if (statusEl) statusEl.textContent = "En vivo";
};

const updateFrame = (card: HTMLElement, frame?: string): void => {
  if (!frame) return;
  const img = card.querySelector<HTMLImageElement>(".camera-stream");
  if (img) img.src = `data:image/jpeg;base64,${frame}`;
};

export const createMultiCamHandler = (
  refs: UIRefs,
  state: AppState,
  stopStream: () => void
): MultiCamHandlers => {
  let nextIndex = 1;

  const setupCard = (sourceLabel: string): { camId: string; title: string; card: HTMLElement } => {
    const index = nextIndex++;
    const camId = `cam-${index}`;
    const title = `Camara ${index}`;
    const card = createCameraCard(title, sourceLabel);
    const listItem = createCameraListItem(title, sourceLabel);
    refs.multiCamGrid.appendChild(card);
    refs.multiCamList.appendChild(listItem);
    setMultiCamActive(refs, true);
    state.multiCamActive = true;
    resetPreview(refs);
    return { camId, title, card };
  };

  const addFromYoutube = (url: string): void => {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) {
      setStatus(refs, "Ingresa una URL de YouTube", false);
      return;
    }

    if (!state.multiCamActive) stopStream();
    const { camId, title, card } = setupCard("YouTube");
    setStatus(refs, `Conectando ${title}...`, true);

    const controller = streamYoutubeDetections(
      normalizedUrl,
      (frame) => {
        const detections = Array.isArray(frame.detections) ? frame.detections : [];
        updateFrame(card, frame.frame);
        updateCameraStatus(card);
        if (frame.alerts?.length) {
          showAlertToasts(frame.alerts.map((a) => ({ ...a, cameraId: title })));
        }
      },
      () => {
        card.querySelector(".camera-status")!.textContent = "Finalizada";
        setStatus(refs, `${title} finalizada`, false);
      },
      (err) => {
        card.querySelector(".camera-status")!.textContent = "Error";
        setStatus(refs, `Error en ${title}: ${err.message}`, false);
      }
    );

    state.multiCamControllers.set(camId, controller);
  };

  const addFromUrl = (source: string): void => {
    const normalizedSource = source.trim();
    if (!normalizedSource) {
      setStatus(refs, "Ingresa una URL de camara", false);
      return;
    }

    if (!state.multiCamActive) stopStream();
    const { camId, title, card } = setupCard(normalizedSource);
    setStatus(refs, `Conectando ${title}...`, true);

    (async () => {
      try {
        await addCameraSource(camId, normalizedSource);
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo conectar la camara";
        card.querySelector(".camera-status")!.textContent = "Error";
        setStatus(refs, `Error en ${title}: ${message}`, false);
        return;
      }

      const img = card.querySelector<HTMLImageElement>(".camera-stream");
      if (img) img.src = cameraStreamUrl(camId);

      const controller = streamCameraEvents(
        camId,
        (payload) => {
          updateCameraStatus(card);
          if (payload.alerts?.length) {
            showAlertToasts(payload.alerts.map((a) => ({ ...a, cameraId: title })));
          }
        },
        () => {
          card.querySelector(".camera-status")!.textContent = "Finalizada";
          setStatus(refs, `${title} finalizada`, false);
        },
        (err) => {
          card.querySelector(".camera-status")!.textContent = "Error";
          setStatus(refs, `Error en ${title}: ${err.message}`, false);
        }
      );

      state.multiCamControllers.set(camId, controller);
    })();
  };

  const addFromFile = (file: File): void => {
    if (!state.multiCamActive) stopStream();
    const sourceLabel = file.type.startsWith("image/") ? "Imagen" : "Video";
    const { camId, title, card } = setupCard(`${sourceLabel}: ${file.name}`);
    setStatus(refs, `Procesando ${title}...`, true);

    if (file.type.startsWith("image/")) {
      (async () => {
        try {
          const result = await uploadAndPredict(file);
          const detections = result.detections ?? [];
          const frame = result.frame ?? result.image;
          updateFrame(card, frame);
          updateCameraStatus(card);
          if (result.alerts?.length) {
            showAlertToasts(result.alerts.map((a) => ({ ...a, cameraId: title })));
          }
          card.querySelector(".camera-status")!.textContent = "Completa";
          setStatus(refs, `${title} completada`, false);
        } catch (err) {
          const message = err instanceof Error ? err.message : "No se pudo analizar la imagen";
          card.querySelector(".camera-status")!.textContent = "Error";
          setStatus(refs, `Error en ${title}: ${message}`, false);
        }
      })();
      return;
    }

    const controller = streamVideoDetections(
      file,
      (frame: VideoFramePayload) => {
        const detections = Array.isArray(frame.detections) ? frame.detections : [];
        updateFrame(card, frame.frame);
        updateCameraStatus(card);
        if (frame.alerts?.length) {
          showAlertToasts(frame.alerts.map((a) => ({ ...a, cameraId: title })));
        }
      },
      () => {
        card.querySelector(".camera-status")!.textContent = "Finalizada";
        setStatus(refs, `${title} finalizada`, false);
      },
      (err) => {
        card.querySelector(".camera-status")!.textContent = "Error";
        setStatus(refs, `Error en ${title}: ${err.message}`, false);
      }
    );

    state.multiCamControllers.set(camId, controller);
  };

  const stopAll = (): void => {
    state.multiCamControllers.forEach((controller) => controller.abort());
    state.multiCamControllers.clear();
    state.multiCamActive = false;
    nextIndex = 1;

    refs.multiCamGrid.innerHTML = "";
    refs.multiCamList.innerHTML = "";
    setMultiCamActive(refs, false);
    resetPreview(refs);
    setStatus(refs, "Panel multicamara detenido", false);
  };

  return { addFromYoutube, addFromUrl, addFromFile, stopAll };
};
