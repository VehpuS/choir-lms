import { useSyncExternalStore } from 'react';

import { pitchCapabilities } from './pitch-capabilities';
import { getPitchStore } from './use-pitch';
import { getMonitorModel, type MonitorNote } from './view/pitch-monitor-model';

const noop = () => undefined;
const never = () => null;

/** `C♯4, 17 cents flat` as `C♯4 · 17 cents flat`: one line for a slim bar. */
export const formatSungReadout = (note: MonitorNote | null): string | null => {
  return note ? note.spokenLabel.replace(', ', ' · ') : null;
};

/**
 * The note being sung with how far off it is, as one line, or null. Like
 * `useSungMidi` it is not a consumer of the pitch store (showing a note must
 * not be what opens the microphone), and it is a string, so it re-renders only
 * when the words change.
 */
export const useSungReadout = (): string | null => {
  const canListen = pitchCapabilities().canListen;
  const store = canListen ? getPitchStore() : null;

  return useSyncExternalStore(
    store ? store.subscribe : () => noop,
    store
      ? () => formatSungReadout(getMonitorModel(store.getState()).note)
      : never,
  );
};
