import { useIsPitchMonitorShown } from '../pitch/components/pitch-monitor-dock';
import { useIsRecordingStripShown } from '../recording/components/recording-dock';

/**
 * Whether the pitch monitor or the recording strip is on. In the wide-short
 * layout that is what puts the trailing panel in the Now Playing pane's place.
 */
export const useHasPracticePanelTool = (): boolean => {
  const isPitchShown = useIsPitchMonitorShown();
  const isRecordingShown = useIsRecordingStripShown();

  return isPitchShown || isRecordingShown;
};
