/**
 * Contexto compartido por todas las features.
 *
 * Evita pasar cuatro parámetros sueltos a cada handler y deja explícito qué
 * puede tocar una feature: refs del DOM, estado, métricas y la rutina común
 * de parada.
 */

import type { AppState } from "../state/app.state";
import type { StatsTracker } from "../ui/components/stats";
import type { UIRefs } from "../ui/refs";

export type FeatureContext = {
  refs: UIRefs;
  state: AppState;
  stats: StatsTracker;
  /** Cancela el stream en curso y devuelve el escenario a su estado neutro. */
  stopStream: () => void;
};
