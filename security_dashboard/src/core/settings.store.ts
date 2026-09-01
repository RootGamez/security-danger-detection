/**
 * Ajustes de inferencia persistidos en localStorage.
 *
 * Hoy sólo el umbral de confianza, que es el parámetro que más se toca al
 * comparar modelos entrenados en Colab.
 */

import { DEFAULT_CONFIDENCE, MAX_CONFIDENCE, MIN_CONFIDENCE } from "../config/env";

const STORAGE_KEY = "securevision.confidence";

const clamp = (value: number): number =>
  Math.min(MAX_CONFIDENCE, Math.max(MIN_CONFIDENCE, value));

const readStored = (): number | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? clamp(parsed) : null;
  } catch {
    return null;
  }
};

let _confidence = readStored() ?? DEFAULT_CONFIDENCE;

const _listeners = new Set<(confidence: number) => void>();

export const getConfidence = (): number => _confidence;

export const setConfidence = (value: number): number => {
  const next = clamp(value);
  if (next === _confidence) return next;

  _confidence = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* storage no disponible: el ajuste vive sólo en memoria */
  }
  _listeners.forEach((listener) => listener(next));
  return next;
};

export const onConfidenceChange = (listener: (confidence: number) => void): (() => void) => {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
};
