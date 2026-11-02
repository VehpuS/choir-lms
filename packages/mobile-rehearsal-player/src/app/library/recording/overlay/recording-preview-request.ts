/**
 * Lets a place that sets a balance without playing (the save sheet now, the
 * export dialog later) ask for the recording to be played over its track at
 * the balance on screen, so the user can hear what they are choosing. The
 * sheet only asks; playback belongs to the router-level host that holds the
 * player (rehearsal-recording design Decision 5).
 */
export type RecordingPreviewRequest =
  | { kind: 'play'; recordingId: string; balance: number }
  | { kind: 'stop'; recordingId: string };

type Listener = (request: RecordingPreviewRequest) => void;

const listeners = new Set<Listener>();
/** The balance a preview wants for the next start of a recording, until it is used. */
const pendingBalances = new Map<string, number>();

export const requestRecordingPreview = (request: RecordingPreviewRequest) => {
  listeners.forEach((listener) => listener(request));
};

export const subscribeToRecordingPreview = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const setPendingPreviewBalance = (
  recordingId: string,
  balance: number,
) => {
  pendingBalances.set(recordingId, balance);
};

/** The balance to start at, once; the saved one applies from then on. */
export const takePendingPreviewBalance = (
  recordingId: string,
): number | undefined => {
  const balance = pendingBalances.get(recordingId);

  pendingBalances.delete(recordingId);

  return balance;
};
