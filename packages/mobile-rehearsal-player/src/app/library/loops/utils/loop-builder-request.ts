// The playback sheet's `Make loop` asks the Library to open the loop editor on
// the active track, starting at the playhead (task 8.47). The request crosses
// the shell and the Library section, so it travels over this small channel
// instead of through every layer's props. The start waits here until the
// editor's draft is built, then is taken once.
export type LoopBuilderRequest = {
  /** A marker pair or next-marker loop also carries its end and a name. */
  endMs?: number;
  name?: string;
  sourceId: string;
  startMs: number;
};

/** What a new loop's draft starts from, beyond the whole track. */
export type RequestedLoopBuilderDraft = {
  endMs?: number;
  name?: string;
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
 * The start (and, for marker loops, end and name) a new loop's draft should
 * use for this source, or null when none was requested, the length is not
 * known yet (the request is kept), or the request does not fit the track: a
 * playhead start must lie inside it, and an explicit range must be usable.
 */
export const takeRequestedLoopBuilderDraft = (options: {
  endMs: number;
  sourceId: string;
}): RequestedLoopBuilderDraft | null => {
  if (
    pendingRequest === null ||
    pendingRequest.sourceId !== options.sourceId ||
    options.endMs <= 0
  ) {
    return null;
  }

  const { endMs, name, startMs } = pendingRequest;

  pendingRequest = null;

  if (endMs === undefined) {
    return startMs > 0 && startMs < options.endMs ? { startMs } : null;
  }

  const clampedEndMs = Math.min(endMs, options.endMs);

  return startMs >= 0 && startMs < clampedEndMs
    ? { endMs: clampedEndMs, ...(name ? { name } : {}), startMs }
    : null;
};

export const clearRequestedLoopBuilder = () => {
  pendingRequest = null;
};
