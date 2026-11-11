import { pitchCapabilities } from '../pitch-capabilities';
import { usePitchMonitorOpen } from '../use-pitch';
import {
  PITCH_MONITOR_HEIGHT,
  PitchMonitorStrip,
  type PitchMonitorPresentation,
} from './pitch-monitor-strip';

/** Whether the monitor is on and the platform can listen. */
export const useIsPitchMonitorShown = (): boolean => {
  const isOpen = usePitchMonitorOpen();

  return isOpen && pitchCapabilities().canListen;
};

/**
 * The strip, only where the platform can listen and the user turned it on. In
 * the wide-short layout it is drawn for the trailing practice panel instead
 * (`presentation="panel"`).
 */
export const PitchMonitorDock = ({
  presentation = 'strip',
}: {
  presentation?: PitchMonitorPresentation;
}) => {
  return useIsPitchMonitorShown() ? (
    <PitchMonitorStrip presentation={presentation} />
  ) : null;
};

/** How tall the shown strip is, or 0 when it is not shown. */
export const usePitchMonitorDockHeight = (): number => {
  return useIsPitchMonitorShown() ? PITCH_MONITOR_HEIGHT : 0;
};
