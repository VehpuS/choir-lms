import { usePianoDockHeight } from '../piano/use-piano-dock-height';
import { usePitchMonitorDockHeight } from '../pitch/components/pitch-monitor-dock';

/** How tall the open practice tools are together, or 0 when none is open. */
export const usePracticeDockHeight = (): number => {
  return usePianoDockHeight() + usePitchMonitorDockHeight();
};
