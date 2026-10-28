import { getPitchMonitorPreference, getPitchStore } from './use-pitch';

/**
 * Turning the monitor on is the user's intent to sing (design Decision 6): the
 * strip opens and starts listening, with the one-time explanation first on the
 * first use. Turning it off stops listening.
 */
export const openPitchMonitor = () => {
  getPitchMonitorPreference().setOpen(true);
  void getPitchStore().requestListen();
};

export const closePitchMonitor = () => {
  getPitchMonitorPreference().setOpen(false);
  getPitchStore().stopListening();
};

export const togglePitchMonitor = () => {
  if (getPitchMonitorPreference().isOpen()) {
    closePitchMonitor();
  } else {
    openPitchMonitor();
  }
};
