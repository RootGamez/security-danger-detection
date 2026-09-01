/**
 * Tarjetas KPI del escenario.
 *
 * El FPS se mide en el cliente sobre una ventana deslizante: interesa el
 * ritmo real al que llegan los fotogramas por el túnel, no el del backend.
 */

import { emptyStats, type SessionStats } from "../../types/domain";
import { formatCount } from "../utils/format";
import type { UIRefs } from "../refs";

/** Ventana usada para promediar el FPS. */
const FPS_WINDOW = 20;

export class StatsTracker {
  private stats: SessionStats = emptyStats();
  private frameTimes: number[] = [];

  constructor(private readonly refs: UIRefs) {}

  reset(): void {
    this.stats = emptyStats();
    this.frameTimes = [];
    this.render();
  }

  /** Registra un fotograma recibido y repinta las tarjetas. */
  recordFrame(detections: number, newAlerts = 0): void {
    this.stats.frames++;
    this.stats.detections = detections;
    this.stats.alerts += newAlerts;

    const now = performance.now();
    this.frameTimes.push(now);
    if (this.frameTimes.length > FPS_WINDOW) this.frameTimes.shift();

    const elapsed = now - this.frameTimes[0];
    this.stats.fps =
      this.frameTimes.length > 1 && elapsed > 0
        ? ((this.frameTimes.length - 1) / elapsed) * 1000
        : 0;

    this.render();
  }

  /** Marca el fin del stream: el FPS deja de tener sentido en vivo. */
  freeze(): void {
    this.stats.fps = 0;
    this.render();
  }

  get snapshot(): Readonly<SessionStats> {
    return this.stats;
  }

  private render(): void {
    const { statFps, statFrames, statDetections, statAlerts } = this.refs;
    statFps.textContent = this.stats.fps > 0 ? this.stats.fps.toFixed(1) : "—";
    statFrames.textContent = formatCount(this.stats.frames);
    statDetections.textContent = formatCount(this.stats.detections);
    statAlerts.textContent = formatCount(this.stats.alerts);

    // El contador de alertas cambia de color en cuanto hay al menos una.
    statAlerts.closest(".stat-tile")?.classList.toggle("stat-tile-alert", this.stats.alerts > 0);
  }
}
