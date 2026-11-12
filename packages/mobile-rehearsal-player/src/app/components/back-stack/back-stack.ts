// The app's TypeScript config carries no DOM library, so the slice of the
// browser used here is described structurally and injected, which also lets the
// logic be tested without a browser.
type HistoryLike = {
  go(delta: number): void;
  pushState(state: unknown, title: string): void;
};
type PopstateTarget = {
  addEventListener(type: 'popstate', listener: () => void): void;
};
export type BackStackEnvironment = {
  history: HistoryLike;
  target: PopstateTarget;
};

type Layer = {
  dismiss: () => void;
  /** False once the layer is gone (closed, or taken by Back). */
  isLive: boolean;
  /** Whether its history entry exists yet (pushes wait for a traversal to finish). */
  isPushed: boolean;
};

const HISTORY_STATE = { choirlmsOverlay: true };

/**
 * Lets the browser's Back (the Android gesture, the browser button) close the
 * topmost open sheet or menu instead of leaving the app. Each open layer holds
 * one same-address history entry. Back pops the newest entry and dismisses its
 * layer; a layer closed another way gives its entry back, so history does not
 * grow. A layer closed out of order keeps its entry until the layers above it
 * are gone, then that entry is given back too.
 *
 * `history.go` is asynchronous, so a push that arrives while one is pending
 * waits for it: otherwise the pending traversal would pop the new entry.
 */
export const createBackStack = ({ history, target }: BackStackEnvironment) => {
  const layers: Layer[] = [];
  // Traversals the stack started itself, whose popstate must not dismiss.
  let pendingTraversals = 0;
  let isListening = false;

  const pushPending = () => {
    for (const layer of layers) {
      if (layer.isLive && !layer.isPushed) {
        history.pushState(HISTORY_STATE, '');
        layer.isPushed = true;
      }
    }
  };

  // Gives back the entries of closed layers at the top, in one traversal.
  const trimClosedLayers = () => {
    let entriesToGiveBack = 0;

    while (layers.length > 0 && !layers[layers.length - 1].isLive) {
      const [closed] = layers.splice(-1);

      if (closed.isPushed) {
        entriesToGiveBack += 1;
      }
    }

    if (entriesToGiveBack > 0) {
      pendingTraversals += 1;
      history.go(-entriesToGiveBack);
    }
  };

  const handlePopstate = () => {
    if (pendingTraversals > 0) {
      pendingTraversals -= 1;

      if (pendingTraversals === 0) {
        pushPending();
      }

      return;
    }

    const layer = layers.pop();

    if (!layer) {
      return;
    }

    // Its entry went with this Back, so closing it later gives nothing back.
    layer.isLive = false;
    layer.dismiss();
    trimClosedLayers();
  };

  const listen = () => {
    if (!isListening) {
      target.addEventListener('popstate', handlePopstate);
      isListening = true;
    }
  };

  return {
    /** Registers an open layer; the returned function releases it. */
    push: (dismiss: () => void) => {
      const layer: Layer = { dismiss, isLive: true, isPushed: false };

      listen();
      layers.push(layer);

      if (pendingTraversals === 0) {
        history.pushState(HISTORY_STATE, '');
        layer.isPushed = true;
      }

      return () => {
        if (!layer.isLive) {
          return;
        }

        layer.isLive = false;
        trimClosedLayers();
      };
    },
  };
};
