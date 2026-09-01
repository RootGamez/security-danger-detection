/**
 * Historial de análisis.
 *
 * Registra cada sesión (imagen, video, cámara, YouTube) y la persiste en
 * localStorage para que sobreviva a un refresco — útil cuando se compara el
 * mismo clip contra varios modelos entrenados en Colab.
 *
 * Expone además `DetectionAccumulator`, que va agregando las detecciones de
 * múltiples fotogramas SSE hasta producir una única entrada de historial.
 */

import type {
  ClassCount,
  DetectionPayload,
  HistoryEntry,
  HistorySource,
  SafetyAlert,
} from "../types/domain";

const STORAGE_KEY = "securevision.history";
const MAX_ENTRIES = 80;

// ── Persistencia ───────────────────────────────────────────────────────────

/** Reconstruye `timestamp` como Date y descarta entradas corruptas. */
const reviveEntries = (raw: string): HistoryEntry[] => {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((item): HistoryEntry[] => {
    const entry = item as Partial<HistoryEntry> & { timestamp?: string };
    if (!entry.id || !entry.source || typeof entry.label !== "string") return [];

    const timestamp = new Date(entry.timestamp ?? "");
    return [
      {
        id: entry.id,
        timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
        source: entry.source,
        label: entry.label,
        classCounts: entry.classCounts ?? [],
        alerts: entry.alerts ?? [],
        frameCount: entry.frameCount,
      },
    ];
  });
};

const loadFromStorage = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? reviveEntries(raw) : [];
  } catch {
    return [];
  }
};

// ── Store en memoria ───────────────────────────────────────────────────────

const _store: HistoryEntry[] = loadFromStorage();
const _listeners = new Set<() => void>();

const persist = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_store));
  } catch {
    /* cuota llena o storage bloqueado: el historial vive sólo en memoria */
  }
};

const commit = (): void => {
  persist();
  _listeners.forEach((listener) => listener());
};

export const onHistoryChange = (listener: () => void): (() => void) => {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
};

export const getHistory = (): readonly HistoryEntry[] => _store;

export const addHistoryEntry = (entry: HistoryEntry): void => {
  _store.unshift(entry); // más reciente primero
  if (_store.length > MAX_ENTRIES) _store.length = MAX_ENTRIES;
  commit();
};

export const removeHistoryEntry = (id: string): void => {
  const index = _store.findIndex((entry) => entry.id === id);
  if (index === -1) return;
  _store.splice(index, 1);
  commit();
};

export const clearHistory = (): void => {
  if (_store.length === 0) return;
  _store.length = 0;
  commit();
};

// ── DetectionAccumulator ───────────────────────────────────────────────────

/**
 * Agrega detecciones de varios fotogramas y produce una única `HistoryEntry`
 * al finalizar.
 *
 *   const acc = new DetectionAccumulator("webcam", "Cámara en vivo");
 *   acc.addFrame(detections, alerts);  // por cada fotograma
 *   acc.finalize();                    // al terminar o al cancelar
 */
export class DetectionAccumulator {
  private readonly classMap = new Map<string, { count: number; maxConfidence: number }>();
  private readonly alertMap = new Map<string, SafetyAlert>();
  private finalised = false;

  public frameCount = 0;

  constructor(
    public readonly source: HistorySource,
    public readonly label: string,
  ) {}

  addFrame(detections: DetectionPayload[], alerts?: SafetyAlert[]): void {
    this.frameCount++;

    for (const detection of detections) {
      const key = detection.class.toLowerCase();
      const previous = this.classMap.get(key);
      if (previous) {
        previous.count++;
        previous.maxConfidence = Math.max(previous.maxConfidence, detection.confidence);
      } else {
        this.classMap.set(key, { count: 1, maxConfidence: detection.confidence });
      }
    }

    for (const alert of alerts ?? []) {
      this.alertMap.set(`${alert.type}|${alert.class}`, alert);
    }
  }

  /** Vuelca lo acumulado al historial. Idempotente. */
  finalize(): HistoryEntry | null {
    if (this.finalised) return null;
    if (this.classMap.size === 0 && this.alertMap.size === 0) return null;
    this.finalised = true;

    const classCounts: ClassCount[] = [...this.classMap.entries()].map(
      ([className, { count, maxConfidence }]) => ({
        class: className,
        count,
        maxConfidence: Math.round(maxConfidence * 1000) / 1000,
      }),
    );

    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      source: this.source,
      label: this.label,
      classCounts,
      alerts: [...this.alertMap.values()],
      frameCount: this.source === "image" ? undefined : this.frameCount,
    };

    addHistoryEntry(entry);
    return entry;
  }
}
