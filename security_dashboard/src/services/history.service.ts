/**
 * Detection history service.
 * Stores a log of every analysis session (image, video, webcam, youtube).
 * Exposes a `DetectionAccumulator` for gradually building a session entry
 * across multiple SSE frames.
 */

import type {
  ClassCount,
  DetectionPayload,
  HistoryEntry,
  HistorySource,
  SafetyAlert,
} from "../types/domain";

// ── In-memory store ────────────────────────────────────────────────────────

const _store: HistoryEntry[] = [];

/** Listeners notified on every store mutation. */
const _listeners = new Set<() => void>();

export const onHistoryChange = (cb: () => void): (() => void) => {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
};

const _notify = () => _listeners.forEach((cb) => cb());

export const getHistory = (): readonly HistoryEntry[] => _store;

export const addHistoryEntry = (entry: HistoryEntry): void => {
  _store.unshift(entry); // newest first
  _notify();
};

export const removeHistoryEntry = (id: string): void => {
  const idx = _store.findIndex((e) => e.id === id);
  if (idx !== -1) { _store.splice(idx, 1); _notify(); }
};

export const clearHistory = (): void => {
  _store.length = 0;
  _notify();
};

// ── DetectionAccumulator ───────────────────────────────────────────────────

/**
 * Accumulates detections across multiple frames (for streaming sessions)
 * and produces a single `HistoryEntry` when finalised.
 *
 * Usage:
 *   const acc = new DetectionAccumulator("webcam", "Cámara en vivo");
 *   // on each frame:
 *   acc.addFrame(detections, alerts);
 *   // when done or stopped:
 *   acc.finalize();   // writes to history store
 */
export class DetectionAccumulator {
  private classMap = new Map<string, { count: number; maxConf: number }>();
  private alertSet = new Map<string, SafetyAlert>(); // dedup key → alert
  public frameCount = 0;
  private finalised = false;

  constructor(
    public readonly source: HistorySource,
    public readonly label: string,
  ) {}

  addFrame(detections: DetectionPayload[], alerts?: SafetyAlert[]): void {
    this.frameCount++;
    for (const d of detections) {
      const key = d.class.toLowerCase();
      const prev = this.classMap.get(key);
      if (prev) {
        prev.count++;
        prev.maxConf = Math.max(prev.maxConf, d.confidence);
      } else {
        this.classMap.set(key, { count: 1, maxConf: d.confidence });
      }
    }
    if (alerts) {
      for (const a of alerts) {
        this.alertSet.set(`${a.type}|${a.class}`, a);
      }
    }
  }

  /** Commits the accumulated data to the history store. Safe to call multiple times. */
  finalize(): HistoryEntry | null {
    if (this.finalised) return null;
    if (this.classMap.size === 0 && this.alertSet.size === 0) return null;
    this.finalised = true;

    const classCounts: ClassCount[] = [...this.classMap.entries()].map(
      ([cls, { count, maxConf }]) => ({
        class: cls,
        count,
        maxConfidence: Math.round(maxConf * 1000) / 1000,
      }),
    );

    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
      source: this.source,
      label: this.label,
      classCounts,
      alerts: [...this.alertSet.values()],
      frameCount: this.source !== "image" ? this.frameCount : undefined,
    };

    addHistoryEntry(entry);
    return entry;
  }
}
