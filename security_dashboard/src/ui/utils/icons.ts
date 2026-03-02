/**
 * SVG icon constants and button label helpers for the webcam control button.
 * Centralises the markup so it isn't duplicated across feature files.
 */

export const WEBCAM_SVG_START = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M20.188 10.934c.2.55.312 1.143.312 1.734 0 3.314-2.686 6-6 6H9.5a6 6 0 1 1 0-12h5a6 6 0 0 1 6 6z"/></svg>`;

export const WEBCAM_SVG_STOP = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;

export const webcamBtnLabelStart = (): string => `${WEBCAM_SVG_START} Usar camara`;
export const webcamBtnLabelStop = (): string => `${WEBCAM_SVG_STOP} Detener camara`;
