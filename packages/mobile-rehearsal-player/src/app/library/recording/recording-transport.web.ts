import type { Transport, TransportEvent } from '@org/audio-mixing';

const MS_PER_SECOND = 1000;

/** The slice of an HTMLMediaElement the transport reads. */
export type MediaElementLike = {
  currentTime: number;
  paused: boolean;
  ended: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

/** Media element events and the transport event each one reports. */
const ELEMENT_EVENTS: ReadonlyArray<readonly [string, TransportEvent]> = [
  ['play', 'play'],
  ['pause', 'pause'],
  ['ended', 'pause'],
  ['seeked', 'seek'],
];

/** A transport over the player's media element (rehearsal-recording design Decision 5). */
export const createMediaElementTransport = (
  element: MediaElementLike,
): Transport => ({
  getPositionMs: () => element.currentTime * MS_PER_SECOND,
  isPlaying: () => !element.paused && !element.ended,
  hasEnded: () => element.ended,
  subscribe: (listener) => {
    const handlers = ELEMENT_EVENTS.map(([type, event]) => {
      const handler = () => listener(event);

      element.addEventListener(type, handler);

      return [type, handler] as const;
    });

    return () =>
      handlers.forEach(([type, handler]) =>
        element.removeEventListener(type, handler),
      );
  },
});

type RntpScope = {
  rntp?: { getMediaElement?: () => MediaElementLike | null };
};

export const getRecordingTransport = (): Transport | null => {
  const element = (globalThis as RntpScope).rntp?.getMediaElement?.() ?? null;

  return element ? createMediaElementTransport(element) : null;
};
