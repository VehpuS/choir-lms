// Snap is suspended while a smooth scroll runs (mandatory snapping fights a
// programmatic scroll). After this long, a little over the ~200 ms the browser
// takes, the view is put on the target (a no-op when the slide got there) and
// snapping is restored, so a slow or stalled slide cannot snap back.
export const SMOOTH_TURN_SETTLE_MS = 300;

/** A turn slides only when it asked to and the device does not ask for less motion. */
export const shouldAnimateTurn = (
  requested: boolean,
  prefersReducedMotion: boolean,
): boolean => requested && !prefersReducedMotion;

/** The part of the host a turn moves. */
export type PdfTurnHost = {
  scrollLeft: number;
  scrollTo(options: { behavior: 'smooth'; left: number; top: number }): void;
  scrollTop: number;
};

export type PdfPageTurner = {
  /** Stops tracking a smooth turn and restores snapping. */
  cancel(): void;
  /** The page a smooth turn is heading to, or undefined when none is running. */
  pendingPage(): number | undefined;
  /** Moves to a page's offset, sliding when `animate` is set and motion is allowed. */
  turn(target: {
    animate: boolean;
    index: number;
    left: number;
    top: number;
  }): void;
};

/**
 * Turns pages, instantly or with a short smooth scroll. A turn started while
 * another runs replaces it, so repeated turns end at the newest target.
 */
export const createPdfPageTurner = (options: {
  host: PdfTurnHost;
  prefersReducedMotion: () => boolean;
  /** Turns the host's snapping off (`false`) while sliding and back on (`true`) after. */
  setSnapping: (isOn: boolean) => void;
}): PdfPageTurner => {
  const { host, prefersReducedMotion, setSnapping } = options;
  let pending: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const finish = (target: { left: number; top: number }) => {
    timer = undefined;
    pending = undefined;
    host.scrollLeft = target.left;
    host.scrollTop = target.top;
    setSnapping(true);
  };

  const cancel = () => {
    if (timer === undefined) {
      return;
    }

    clearTimeout(timer);
    timer = undefined;
    pending = undefined;
    setSnapping(true);
  };

  return {
    cancel,
    pendingPage: () => pending,
    turn({ animate, index, left, top }) {
      if (!shouldAnimateTurn(animate, prefersReducedMotion())) {
        cancel();
        host.scrollLeft = left;
        host.scrollTop = top;

        return;
      }

      clearTimeout(timer);
      pending = index;
      setSnapping(false);
      host.scrollTo({ behavior: 'smooth', left, top });
      timer = setTimeout(() => finish({ left, top }), SMOOTH_TURN_SETTLE_MS);
    },
  };
};
