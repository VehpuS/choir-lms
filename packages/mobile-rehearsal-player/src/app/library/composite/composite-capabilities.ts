import { Platform } from 'react-native';

export type CompositeCapabilities = {
  canPlayComposites: boolean;
};

/** Shown in place of a composite where it cannot play; not an error. */
export const COMPOSITE_UNAVAILABLE_MESSAGE = 'Composites play on web for now.';

/**
 * Playing a composite needs Web Audio with audio worklets (the pitch node and
 * the mix limiter) and IndexedDB for the prepared stems. It is web-only for
 * now (composite-tracks non-goals); creating one, playing one and every list
 * row go through this check. Native shows a composite as unavailable.
 */
export const resolveCompositeCapabilities = (options: {
  platformOs: string | null;
  hasAudioContext: boolean;
  hasAudioWorklet: boolean;
  hasIndexedDb: boolean;
}): CompositeCapabilities => {
  return {
    canPlayComposites:
      options.platformOs === 'web' &&
      options.hasAudioContext &&
      options.hasAudioWorklet &&
      options.hasIndexedDb,
  };
};

export const compositeCapabilities = (): CompositeCapabilities => {
  const browser = globalThis as { indexedDB?: unknown };

  return resolveCompositeCapabilities({
    platformOs: Platform.OS,
    hasAudioContext: 'AudioContext' in globalThis,
    hasAudioWorklet:
      'AudioContext' in globalThis && 'AudioWorkletNode' in globalThis,
    hasIndexedDb: browser.indexedDB !== undefined,
  });
};

export type CompositeAvailability =
  | { available: true }
  | { available: false; message: string };

/** What a composite item shows: playable, or unavailable with the message and no error. */
export const resolveCompositeAvailability = (
  capabilities: CompositeCapabilities,
): CompositeAvailability => {
  return capabilities.canPlayComposites
    ? { available: true }
    : { available: false, message: COMPOSITE_UNAVAILABLE_MESSAGE };
};
