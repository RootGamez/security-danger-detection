/**
 * Comportamiento compartido de los diálogos modales.
 *
 * Cubre las pautas `modal-escape`, `escape-routes` y `focus-management`:
 * cierre con Escape y con clic en el fondo, foco inicial dentro del diálogo
 * y devolución del foco al elemento que lo abrió.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type ModalController = {
  open: () => void;
  close: () => void;
  readonly isOpen: boolean;
};

export type ModalOptions = {
  /** Se ejecuta justo después de abrir (p. ej. precargar un input). */
  onOpen?: () => void;
  /** Selector del elemento que recibe el foco al abrir. */
  initialFocus?: string;
};

/**
 * Conecta un elemento `.modal` a su ciclo de vida.
 * Devuelve el controlador; no abre nada por sí solo.
 */
export const createModal = (element: HTMLElement, options: ModalOptions = {}): ModalController => {
  let isOpen = false;
  let lastFocused: HTMLElement | null = null;

  const focusables = (): HTMLElement[] =>
    Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (node) => node.offsetParent !== null,
    );

  /** Mantiene el foco dentro del diálogo mientras está abierto. */
  const trapFocus = (event: KeyboardEvent): void => {
    const nodes = focusables();
    if (nodes.length === 0) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      trapFocus(event);
    }
  };

  const open = (): void => {
    if (isOpen) return;
    isOpen = true;
    lastFocused = document.activeElement as HTMLElement | null;

    element.classList.remove("hidden");
    element.setAttribute("aria-hidden", "false");
    document.addEventListener("keydown", onKeydown, true);

    options.onOpen?.();

    const target = options.initialFocus
      ? element.querySelector<HTMLElement>(options.initialFocus)
      : focusables()[0];
    requestAnimationFrame(() => target?.focus());
  };

  const close = (): void => {
    if (!isOpen) return;
    isOpen = false;

    element.classList.add("hidden");
    element.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKeydown, true);

    lastFocused?.focus();
    lastFocused = null;
  };

  // Clic en el fondo (cualquier nodo marcado con data-close).
  element.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).dataset.close === "true") close();
  });

  return {
    open,
    close,
    get isOpen() {
      return isOpen;
    },
  };
};
