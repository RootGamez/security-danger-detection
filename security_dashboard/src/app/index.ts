import { streamVideoDetections, streamWebcamDetections, streamYoutubeDetections, uploadAndPredict } from "../lib/api";
import type { DetectionPayload } from "../lib/types";
import type { VideoFramePayload } from "../lib/types";
import type { WebcamFramePayload } from "../lib/types";
import {
  drawOverlayBoxes,
  drawOverlayBoxesOnCanvas,
  drawOverlayBoxesOnVideo,
  mountApp,
  renderDetections,
  setStatus,
  showPreview,
  showVideoPreview
} from "../ui";

const VIDEO_EXTS = new Set([".mp4", ".avi", ".mov", ".mkv", ".webm", ".mpeg", ".mpg"]);

const isVideoFile = (file: File): boolean => {
  if (file.type.startsWith("video/")) return true;
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return VIDEO_EXTS.has(ext);
};

export const initApp = () => {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) throw new Error("App container not found");

  const refs = mountApp(app);
  let lastDetections: DetectionPayload[] = [];
  let webcamModeActive = false;

  // ── Canvas webcam render ──────────────────────────────────────────────────
  let canvasCtx: CanvasRenderingContext2D | null = null;

  const showLiveBadge = (visible: boolean) => {
    const existing = document.getElementById("live-badge");
    if (!visible) { existing?.remove(); return; }
    if (existing) return;
    const badge = document.createElement("div");
    badge.id = "live-badge";
    badge.innerHTML = `<span class="live-dot"></span> EN VIVO`;
    refs.previewContainer.appendChild(badge);
  };

  const drawWebcamFrame = (base64: string, detections: DetectionPayload[]) => {
    const img = new Image();
    img.onload = () => {
      if (!webcamModeActive) return;
      const canvas = refs.webcamCanvas;
      if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      if (!canvasCtx) canvasCtx = canvas.getContext("2d");
      canvasCtx?.drawImage(img, 0, 0);
      drawOverlayBoxesOnCanvas(refs, detections);
    };
    img.src = `data:image/jpeg;base64,${base64}`;
  };

  // ── Video playback sync ──────────────────────────────────────────────────
  // We build a sorted timeline of { t, detections } so we can binary-search
  // by the video's currentTime and overlay the right bounding boxes.
  let frameTimeline: VideoFramePayload[] = [];
  let videoStreamAbort: AbortController | null = null;
  let rafId: number | null = null;

  const stopVideoStream = () => {
    videoStreamAbort?.abort();
    videoStreamAbort = null;
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    frameTimeline = [];
    // Stop webcam mode
    if (webcamModeActive) {
      webcamModeActive = false;
      canvasCtx = null;
      showLiveBadge(false);
      refs.webcamCanvas.classList.add("hidden");
      refs.webcamBtn.classList.remove("active");
      refs.webcamBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M20.188 10.934c.2.55.312 1.143.312 1.734 0 3.314-2.686 6-6 6H9.5a6 6 0 1 1 0-12h5a6 6 0 0 1 6 6z"/></svg> Usar camara`;
    }
  };

  /** Find the last received frame whose timestamp ≤ currentTime */
  const findFrame = (currentTime: number): VideoFramePayload | null => {
    if (frameTimeline.length === 0) return null;
    let lo = 0, hi = frameTimeline.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (frameTimeline[mid].t <= currentTime) lo = mid;
      else hi = mid - 1;
    }
    return frameTimeline[lo].t <= currentTime ? frameTimeline[lo] : null;
  };

  /** rAF loop: keep overlay in sync with video playback */
  const startRaf = () => {
    const tick = () => {
      if (!refs.previewVideo.paused && !refs.previewVideo.ended) {
        const frame = findFrame(refs.previewVideo.currentTime);
        if (frame) drawOverlayBoxesOnVideo(refs, frame.detections);
        else refs.overlayLayer.innerHTML = "";
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  };

  // Also update boxes when the user scrubs manually (seeking)
  refs.previewVideo.addEventListener("seeked", () => {
    const frame = findFrame(refs.previewVideo.currentTime);
    drawOverlayBoxesOnVideo(refs, frame?.detections ?? []);
  });

  // ── Image handler ────────────────────────────────────────────────────────
  const handleImageFile = async (file: File) => {
    webcamModeActive = false;
    stopVideoStream();
    showPreview(refs, file);
    setStatus(refs, "Analizando imagen...", true);
    refs.resultsBox.innerHTML = "";

    try {
      const detections = await uploadAndPredict(file);
      lastDetections = detections;
      renderDetections(refs, detections);
      setStatus(refs, "Análisis completado", false);
    } catch (error) {
      console.error(error);
      refs.resultsBox.innerHTML = '<p class="text-red-300">No se pudo procesar la imagen.</p>';
      setStatus(refs, "Fallo al analizar", false);
    }
  };

  // ── Video handler ────────────────────────────────────────────────────────
  const handleVideoFile = (file: File) => {
    webcamModeActive = false;
    stopVideoStream();
    showVideoPreview(refs, file);
    setStatus(refs, "Subiendo video y analizando...", true);
    refs.resultsBox.innerHTML = "";
    frameTimeline = [];

    let framesReceived = 0;
    let done = false;

    videoStreamAbort = streamVideoDetections(
      file,
      (frame) => {
        // Insert in sorted order (frames arrive in order but just in case)
        frameTimeline.push(frame);
        framesReceived++;

        if (!done) {
          // Show live count
          setStatus(refs, `Analizando... ${framesReceived} fotogramas procesados`, true);

          // Show detections list for latest frame with something detected
          if (frame.detections.length > 0) {
            renderDetections(refs, frame.detections);
          }
        }
      },
      () => {
        done = true;
        // Sort by timestamp to ensure correct binary search
        frameTimeline.sort((a, b) => a.t - b.t);
        setStatus(refs, `Video analizado — ${framesReceived} fotogramas`, false);
        // Update overlay to video's current time
        const frame = findFrame(refs.previewVideo.currentTime);
        drawOverlayBoxesOnVideo(refs, frame?.detections ?? []);
        startRaf();
      },
      (err) => {
        console.error(err);
        refs.resultsBox.innerHTML = '<p class="text-red-300">No se pudo procesar el video.</p>';
        setStatus(refs, "Fallo al analizar video", false);
      }
    );

    // Start rAF immediately so boxes appear as frames stream in
    startRaf();
  };

  // ── Unified file handler ─────────────────────────────────────────────────
  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (isVideoFile(file)) {
      handleVideoFile(file);
    } else if (file.type.startsWith("image/")) {
      void handleImageFile(file);
    } else {
      setStatus(refs, "Formato no soportado", false);
    }
  };

  // ── YouTube URL handler ──────────────────────────────────────────────────
  const handleYoutubeUrl = (url: string) => {
    if (!url.trim()) return;
    webcamModeActive = false;
    stopVideoStream();
    refs.previewImg.classList.add("hidden");
    refs.previewVideo.classList.add("hidden");
    refs.previewVideo.src = "";
    refs.webcamCanvas.classList.add("hidden");
    refs.overlayLayer.innerHTML = "";
    refs.previewContainer.querySelector("span")?.classList.remove("hidden");
    refs.resultsBox.innerHTML = "";
    setStatus(refs, "Descargando y analizando video de YouTube...", true);

    let framesReceived = 0;

    videoStreamAbort = streamYoutubeDetections(
      url,
      (frame) => {
        frameTimeline.push(frame);
        framesReceived++;
        setStatus(refs, `Analizando... ${framesReceived} fotogramas procesados`, true);
        if (frame.detections.length > 0) renderDetections(refs, frame.detections);
      },
      () => {
        frameTimeline.sort((a, b) => a.t - b.t);
        setStatus(refs, `Video analizado — ${framesReceived} fotogramas`, false);
        refs.overlayLayer.innerHTML = "";
      },
      (err) => {
        console.error(err);
        refs.resultsBox.innerHTML = `<p class="text-red-300">${err.message}</p>`;
        setStatus(refs, "Fallo al analizar video", false);
      }
    );
  };

  // ── Webcam handler ───────────────────────────────────────────────────────
  const handleWebcam = () => {
    // Toggle off if already running
    if (webcamModeActive) {
      stopVideoStream();
      setStatus(refs, "Camara detenida.", false);
      return;
    }

    webcamModeActive = true;
    canvasCtx = null;
    stopVideoStream();
    webcamModeActive = true; // restore after stopVideoStream reset

    // Hide other media, show canvas
    refs.previewImg.classList.add("hidden");
    refs.previewImg.src = "";
    refs.previewVideo.classList.add("hidden");
    refs.previewVideo.src = "";
    refs.webcamCanvas.classList.remove("hidden");
    refs.overlayLayer.innerHTML = "";
    refs.previewContainer.querySelector("#preview-placeholder")?.classList.add("hidden");
    refs.resultsBox.innerHTML = "";

    // Button → stop state
    refs.webcamBtn.classList.add("active");
    refs.webcamBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> Detener camara`;

    showLiveBadge(true);
    setStatus(refs, "Conectando camara...", true);

    let framesReceived = 0;

    videoStreamAbort = streamWebcamDetections(
      (frame: WebcamFramePayload) => {
        if (!webcamModeActive) return;
        framesReceived++;
        setStatus(refs, `Camara activa · ${framesReceived} frames`, true);
        if (frame.frame) {
          drawWebcamFrame(frame.frame, frame.detections);
        }
        if (frame.detections.length > 0) {
          renderDetections(refs, frame.detections);
        } else if (framesReceived % 30 === 0) {
          refs.resultsBox.innerHTML = '<p style="font-size:.78rem;color:#475569;padding:6px 0">Sin detecciones.</p>';
        }
      },
      () => {
        showLiveBadge(false);
        setStatus(refs, `Camara finalizada · ${framesReceived} frames`, false);
        refs.webcamBtn.classList.remove("active");
        refs.webcamBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M20.188 10.934c.2.55.312 1.143.312 1.734 0 3.314-2.686 6-6 6H9.5a6 6 0 1 1 0-12h5a6 6 0 0 1 6 6z"/></svg> Usar camara`;
        webcamModeActive = false;
      },
      (err) => {
        showLiveBadge(false);
        console.error(err);
        refs.resultsBox.innerHTML = `<p style="color:#f87171;font-size:.8rem">${err.message}</p>`;
        setStatus(refs, "Fallo al conectar camara", false);
        refs.webcamBtn.classList.remove("active");
        refs.webcamBtn.innerHTML = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M20.188 10.934c.2.55.312 1.143.312 1.734 0 3.314-2.686 6-6 6H9.5a6 6 0 1 1 0-12h5a6 6 0 0 1 6 6z"/></svg> Usar camara`;
        webcamModeActive = false;
      },
      { deviceIndex: 0, maxFps: 10 }
    );
  };

  // ── YouTube accordion toggle ─────────────────────────────────────────────
  const ytToggle = document.querySelector<HTMLButtonElement>("#yt-toggle");
  const ytPanel  = document.querySelector<HTMLDivElement>("#yt-panel");
  const ytChevron = document.querySelector<SVGElement>("#yt-chevron");

  ytToggle?.addEventListener("click", () => {
    const expanded = ytToggle.getAttribute("aria-expanded") === "true";
    ytToggle.setAttribute("aria-expanded", String(!expanded));
    if (ytPanel) ytPanel.style.maxHeight = expanded ? "0" : ytPanel.scrollHeight + "px";
  });

  // ── Event wiring ─────────────────────────────────────────────────────────
  refs.browseBtn.addEventListener("click", () => refs.fileInput.click());
  refs.fileInput.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    handleFile(file);
  });
  refs.webcamBtn.addEventListener("click", handleWebcam);

  const ytBtn = document.querySelector<HTMLButtonElement>("#yt-btn");
  const ytInput = document.querySelector<HTMLInputElement>("#yt-input");
  ytBtn?.addEventListener("click", () => handleYoutubeUrl(ytInput?.value ?? ""));
  ytInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleYoutubeUrl(ytInput.value);
  });

  refs.dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    refs.dropArea.classList.add("drag-over");
  });

  ["dragleave", "dragend", "drop"].forEach((evt) => {
    refs.dropArea.addEventListener(evt, () => refs.dropArea.classList.remove("drag-over"));
  });

  refs.dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  });

  // Image: redraw boxes after natural size becomes known
  refs.previewImg.addEventListener("load", () => {
    if (lastDetections.length) drawOverlayBoxes(refs, lastDetections);
  });

  setStatus(refs, "Esperando archivo...");
};
