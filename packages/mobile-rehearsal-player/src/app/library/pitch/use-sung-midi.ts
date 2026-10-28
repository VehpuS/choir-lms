import { useSyncExternalStore } from 'react';

import { pitchCapabilities } from './pitch-capabilities';
import { getPitchStore } from './use-pitch';

const noop = () => undefined;
const never = () => null;

/**
 * The note being sung, or null. It is a plain number, so a surface that only
 * marks a note (the piano, the score) re-renders when the note changes, not on
 * every frame. Unlike `usePitch` it is not a consumer: showing a note must not
 * be what opens the microphone. Null where pitch detection is unavailable.
 */
export const useSungMidi = (): number | null => {
  const canListen = pitchCapabilities().canListen;
  const store = canListen ? getPitchStore() : null;

  return useSyncExternalStore(
    store ? store.subscribe : () => noop,
    store
      ? () => {
          const { status, reading } = store.getState();

          return status === 'listening' && reading.active ? reading.midi : null;
        }
      : never,
  );
};
