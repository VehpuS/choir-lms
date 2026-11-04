/**
 * Lets a place that sets a balance without playing (the save sheet now, the
 * export dialog later) ask for the recording to be played over its track at
 * the balance on screen, so the user can hear what they are choosing. The
 * sheet only asks; playback belongs to the router-level host that holds the
 * player (rehearsal-recording design Decision 5).
 */
export type RecordingPreviewRequest =
  | { kind: 'play'; recordingId: string; balance: number; levelDb?: number }
  | { kind: 'stop'; recordingId: string };

type Listener = (request: RecordingPreviewRequest) => void;

const listeners = new Set<Listener>();
/** The balance and level a preview wants for the next start of a recording, until used. */
export type PendingPreview = { balance: number; levelDb?: number };
const pendingPreviews = new Map<string, PendingPreview>();

export const requestRecordingPreview = (request: RecordingPreviewRequest) => {
  listeners.forEach((listener) => listener(request));
};

export const subscribeToRecordingPreview = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const setPendingPreview = (
  recordingId: string,
  preview: PendingPreview,
) => {
  pendingPreviews.set(recordingId, preview);
};

/** What to start at, once; the saved balance and level apply from then on. */
export const takePendingPreview = (
  recordingId: string,
): PendingPreview | undefined => {
  const preview = pendingPreviews.get(recordingId);

  pendingPreviews.delete(recordingId);

  return preview;
};
