// Snap is suspended while a smooth scroll runs (mandatory snapping fights a
// programmatic scroll) and comes back when the slide has ended. Browsers set
// the slide's length themselves (about 350 ms for a page in Chrome, longer for
// several), so the end is read from the scroll itself: `scrollend` where it
// exists, else a short quiet spell after the last scroll event. A slide that
// never starts (a page that is not painting) is caught by the stall timer,
// which puts the view on the target. Writing the offset mid-slide does not stop
// the slide, and it overshoots, so a slide that is moving is never cut short.
export const SMOOTH_TURN_STALL_MS = 700;
export const SMOOTH_TURN_IDLE_MS = 150;
const OFFSET_TOLERANCE_PX = 1;

/** A turn slides only when it asked to and the device does not ask for less motion. */
export const shouldAnimateTurn = (
  requested: boolean,
  prefersReducedMotion: boolean,
): boolean => requested && !prefersReducedMotion;

/** The part of the host a turn moves. */
export type PdfTurnHost = {
  /** Reports the end of a smooth scroll (`scrollend`); absent where unsupported. */
  addEventListener?(type: 'scroll' | 'scrollend', listener: () => void): void;
  removeEventListener?(
    type: 'scroll' | 'scrollend',
    listener: () => void,
  ): void;
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
  let stopListening: (() => void) | undefined;

  const clear = () => {
    clearTimeout(timer);
    timer = undefined;
    pending = undefined;
    stopListening?.();
    stopListening = undefined;
  };

  const cancel = () => {
    if (pending === undefined) {
      return;
    }

    clear();
    setSnapping(true);
  };

  const finish = (target: { left: number; top: number }) => {
    clear();

    // Only a slide that stalled is off its target; a finished one is not touched.
    if (
      Math.abs(host.scrollLeft - target.left) > OFFSET_TOLERANCE_PX ||
      Math.abs(host.scrollTop - target.top) > OFFSET_TOLERANCE_PX
    ) {
      host.scrollLeft = target.left;
      host.scrollTop = target.top;
    }

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

      clear();
      pending = index;
      setSnapping(false);
      host.scrollTo({ behavior: 'smooth', left, top });

      const onEnd = () => finish({ left, top });
      const arm = (delay: number) => {
        clearTimeout(timer);
        timer = setTimeout(onEnd, delay);
      };
      // Each scroll event of the slide pushes the end back by the idle spell.
      const onScroll = () => arm(SMOOTH_TURN_IDLE_MS);

      host.addEventListener?.('scroll', onScroll);
      host.addEventListener?.('scrollend', onEnd);
      stopListening = () => {
        host.removeEventListener?.('scroll', onScroll);
        host.removeEventListener?.('scrollend', onEnd);
      };
      arm(SMOOTH_TURN_STALL_MS);
    },
  };
};
