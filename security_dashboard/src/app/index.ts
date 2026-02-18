import { streamVideoDetections, uploadAndPredict } from "../lib/api";
import type { DetectionPayload } from "../lib/types";
import type { VideoFramePayload } from "../lib/types";
import {
  drawOverlayBoxes,
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

  // ── Event wiring ─────────────────────────────────────────────────────────
  refs.browseBtn.addEventListener("click", () => refs.fileInput.click());
  refs.fileInput.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    handleFile(file);
  });

  refs.dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    refs.dropArea.classList.add("border-accent-500");
  });

  ["dragleave", "dragend", "drop"].forEach((evt) => {
    refs.dropArea.addEventListener(evt, () => refs.dropArea.classList.remove("border-accent-500"));
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
