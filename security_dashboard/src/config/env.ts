/**
 * API endpoint configuration.
 * Switch between local and remote backends by toggling the blocks below.
 */

// ── Local backend ──────────────────────────────────────────────────────────
export const API_URL         = "http://localhost:8000/predict";
export const VIDEO_API_URL   = "http://localhost:8000/predict/video";
export const YOUTUBE_API_URL = "http://localhost:8000/predict/youtube";
export const WEBCAM_API_URL  = "http://localhost:8000/predict/webcam";

// ── Remote (Colab / Localtunnel) ───────────────────────────────────────────
// export const API_URL         = "https://soft-groups-march.loca.lt/predict";
// export const VIDEO_API_URL   = "https://soft-groups-march.loca.lt/predict/video";
// export const YOUTUBE_API_URL = "https://soft-groups-march.loca.lt/predict/youtube";
// export const WEBCAM_API_URL  = "https://soft-groups-march.loca.lt/predict/webcam";
