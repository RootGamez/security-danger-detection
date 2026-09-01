/**
 * Indicador de conexión y diálogo de configuración del backend.
 *
 * Es la pieza que hace que cambiar de túnel no cueste nada: la pastilla de la
 * barra superior muestra a qué URL se está apuntando y si responde, y el
 * diálogo permite pegar la nueva URL de Colab y probarla en el sitio, sin
 * reiniciar Vite ni tocar `.env`.
 */

import {
  getBackendConfig,
  isValidBackendUrl,
  onBackendChange,
  resetApiBaseUrl,
  setApiBaseUrl,
} from "../../core/backend.store";
import { checkHealth, type HealthStatus } from "../../services/health.service";
import { truncateMiddle } from "../utils/format";
import { createModal, type ModalController } from "./modal";
import type { UIRefs } from "../refs";

/** Reintento automático mientras el backend no responde. */
const RETRY_INTERVAL_MS = 20_000;

/** Muestra `https://foo.loca.lt` como `foo.loca.lt`, que es lo que importa. */
const displayUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    return truncateMiddle(`${parsed.host}${parsed.pathname.replace(/\/$/, "")}`, 28);
  } catch {
    return truncateMiddle(url, 28);
  }
};

export type BackendPanelController = {
  /** Lanza una comprobación de salud contra la URL activa. */
  refresh: () => Promise<void>;
  /** Abre el diálogo de configuración. */
  open: () => void;
};

export const initBackendPanel = (refs: UIRefs): BackendPanelController => {
  let status: HealthStatus = "unknown";
  let retryTimer: number | null = null;
  /** Sondeo en vuelo. Se cancela en cuanto arranca otro. */
  let probe: AbortController | null = null;

  // ── Pintado del indicador ────────────────────────────────────────────────

  const setPill = (nextStatus: HealthStatus, meta: string): void => {
    status = nextStatus;
    refs.backendDot.dataset.status = nextStatus;
    refs.backendMeta.textContent = meta;
    refs.backendUrlLabel.textContent = displayUrl(getBackendConfig().baseUrl);
    refs.backendPill.dataset.status = nextStatus;
    refs.backendPill.setAttribute(
      "aria-label",
      `Backend ${getBackendConfig().baseUrl} — ${meta}. Pulsa para configurar.`,
    );
  };

  const setFeedback = (message: string, tone: "ok" | "error" | "muted"): void => {
    refs.backendFeedback.textContent = message;
    refs.backendFeedback.dataset.tone = tone;
  };

  const renderConfigInfo = (): void => {
    const config = getBackendConfig();
    refs.backendOrigin.textContent =
      config.origin === "override" ? "Guardado en este navegador" : "Variable de entorno (.env)";
    refs.backendEnvUrl.textContent = config.envUrl;
    refs.backendInput.value = config.baseUrl;
    refs.backendResetBtn.disabled = config.origin === "env";
  };

  // ── Sondeo ───────────────────────────────────────────────────────────────

  const scheduleRetry = (): void => {
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => void refresh(), RETRY_INTERVAL_MS);
  };

  const cancelRetry = (): void => {
    if (retryTimer === null) return;
    window.clearTimeout(retryTimer);
    retryTimer = null;
  };

  const refresh = async (): Promise<void> => {
    cancelRetry();

    // Un sondeo anterior sobre otra URL no debe pisar este resultado.
    probe?.abort();
    const current = new AbortController();
    probe = current;

    setPill("checking", "Comprobando…");

    const result = await checkHealth(current.signal);
    if (probe !== current) return; // superado por un sondeo más reciente

    if (result.status === "online") {
      const device = result.device ? result.device.toUpperCase() : "activo";
      setPill("online", `${device} · ${result.latencyMs} ms`);
      refs.backendDevice.textContent = result.device ?? "—";
      if (modal.isOpen) setFeedback(`Conectado correctamente (${result.latencyMs} ms).`, "ok");
      return;
    }

    setPill("offline", "Sin conexión");
    refs.backendDevice.textContent = "—";
    if (modal.isOpen) setFeedback(result.error ?? "No se pudo conectar.", "error");
    scheduleRetry();
  };

  // ── Diálogo ──────────────────────────────────────────────────────────────

  const modal: ModalController = createModal(refs.backendModal, {
    initialFocus: "#backend-input",
    onOpen: () => {
      renderConfigInfo();
      setFeedback(
        status === "online" ? "El backend responde correctamente." : "Pega la URL de tu túnel y guarda.",
        status === "online" ? "ok" : "muted",
      );
    },
  });

  const applyUrl = async (): Promise<void> => {
    const raw = refs.backendInput.value.trim();

    if (!raw) {
      setFeedback("Escribe una URL antes de guardar.", "error");
      refs.backendInput.focus();
      return;
    }
    if (!isValidBackendUrl(raw)) {
      setFeedback("URL no válida. Debe empezar por http:// o https://", "error");
      refs.backendInput.focus();
      return;
    }

    setApiBaseUrl(raw);
    renderConfigInfo();
    setFeedback("Guardado. Comprobando conexión…", "muted");
    await refresh();
  };

  // ── Cableado ─────────────────────────────────────────────────────────────

  refs.backendPill.addEventListener("click", () => modal.open());
  refs.backendCloseBtn.addEventListener("click", () => modal.close());
  refs.backendSaveBtn.addEventListener("click", () => void applyUrl());
  refs.backendTestBtn.addEventListener("click", () => void refresh());

  refs.backendResetBtn.addEventListener("click", () => {
    resetApiBaseUrl();
    renderConfigInfo();
    setFeedback("Restablecido al valor de .env. Comprobando…", "muted");
    void refresh();
  });

  refs.backendInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void applyUrl();
    }
  });

  // Un cambio de URL desde cualquier origen repinta el indicador.
  onBackendChange(() => {
    renderConfigInfo();
    setPill(status, refs.backendMeta.textContent ?? "");
  });

  // Al recuperar la red o volver a la pestaña, re-sondea de inmediato.
  window.addEventListener("online", () => void refresh());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && status !== "online") void refresh();
  });

  renderConfigInfo();
  setPill("unknown", "Comprobando…");

  return { refresh, open: () => modal.open() };
};
