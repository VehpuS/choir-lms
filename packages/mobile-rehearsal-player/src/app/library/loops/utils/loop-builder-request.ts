// The playback sheet's `Make loop` asks the Library to open the loop editor on
// the active track, starting at the playhead (task 8.47). The request crosses
// the shell and the Library section, so it travels over this small channel
// instead of through every layer's props. The start waits here until the
// editor's draft is built, then is taken once.
export type LoopBuilderRequest = {
  sourceId: string;
  startMs: number;
};

type Listener = (request: LoopBuilderRequest) => void;

const listeners = new Set<Listener>();
let pendingRequest: LoopBuilderRequest | null = null;

export const requestLoopBuilder = (request: LoopBuilderRequest) => {
  pendingRequest = request;
  listeners.forEach((listener) => {
    listener(request);
  });
};

export const subscribeToLoopBuilderRequests = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/**
 * The start a new loop's draft should use for this source, or null when none
 * was requested, the length is not known yet (the request is kept), or the
 * playhead is not inside the track.
 */
export const takeRequestedLoopBuilderStart = (options: {
  endMs: number;
  sourceId: string;
}): number | null => {
  if (
    pendingRequest === null ||
    pendingRequest.sourceId !== options.sourceId ||
    options.endMs <= 0
  ) {
    return null;
  }

  const { startMs } = pendingRequest;

  pendingRequest = null;

  return startMs > 0 && startMs < options.endMs ? startMs : null;
};

export const clearRequestedLoopBuilder = () => {
  pendingRequest = null;
};
