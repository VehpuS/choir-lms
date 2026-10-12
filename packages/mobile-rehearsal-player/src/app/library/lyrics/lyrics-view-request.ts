// The surfaces that show lyrics (the playback section, the mini-player) ask for
// the peek or reading mode over this small channel, as menus do for the editor
// over the saved-item request channel, so one host owns both views.
export type LyricsViewMode = 'peek' | 'reading';

export type LyricsViewRequest = {
  mode: LyricsViewMode;
  /** The source id of the playing item, resolved to its owning track. */
  sourceId: string;
};

type Listener = (request: LyricsViewRequest) => void;

const listeners = new Set<Listener>();

export const requestLyricsView = (request: LyricsViewRequest) => {
  listeners.forEach((listener) => {
    listener(request);
  });
};

export const subscribeToLyricsViewRequests = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
