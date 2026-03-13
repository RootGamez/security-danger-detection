/**
 * API endpoint configuration.
 * Switch between local and remote backends by toggling the blocks below.
 */

// ── Local backend ──────────────────────────────────────────────────────────
const BASE_URL = "http://localhost:8000";
// const BASE_URL = "https://wicked-horses-leave.loca.lt";

export const API_URL         = `${BASE_URL}/predict`;
export const VIDEO_API_URL   = `${BASE_URL}/predict/video`;
export const YOUTUBE_API_URL = `${BASE_URL}/predict/youtube`;
export const WEBCAM_API_URL  = `${BASE_URL}/predict/webcam`;

export const CAMERA_ADD_URL    = `${BASE_URL}/camera/add`;
export const CAMERA_STREAM_URL = (camId: string): string => `${BASE_URL}/camera/${camId}/stream`;
export const CAMERA_EVENTS_URL = (camId: string): string => `${BASE_URL}/camera/${camId}/events`;
