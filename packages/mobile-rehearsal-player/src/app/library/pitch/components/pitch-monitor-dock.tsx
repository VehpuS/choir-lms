import { pitchCapabilities } from '../pitch-capabilities';
import { usePitchMonitorOpen } from '../use-pitch';
import { PITCH_MONITOR_HEIGHT, PitchMonitorStrip } from './pitch-monitor-strip';

const useIsMonitorShown = (): boolean => {
  const isOpen = usePitchMonitorOpen();

  return isOpen && pitchCapabilities().canListen;
};

/** The strip, only where the platform can listen and the user turned it on. */
export const PitchMonitorDock = () => {
  return useIsMonitorShown() ? <PitchMonitorStrip /> : null;
};

/** How tall the shown strip is, or 0 when it is not shown. */
export const usePitchMonitorDockHeight = (): number => {
  return useIsMonitorShown() ? PITCH_MONITOR_HEIGHT : 0;
};
