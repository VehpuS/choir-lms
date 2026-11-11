import { useLayoutClass } from '../../routing/shell/layout-class';
import { usePianoDockHeight } from '../piano/use-piano-dock-height';
import { usePitchMonitorDockHeight } from '../pitch/components/pitch-monitor-dock';
import { useRecordingDockHeight } from '../recording/components/recording-dock';

/**
 * How tall the open practice tools are together at the bottom of the shell, or
 * 0 when none is open. In the wide-short layout the pitch monitor and the
 * recording strip sit in the trailing panel (or the card over the playback
 * view) and take no height; over the playback view the piano is full screen.
 */
export const usePracticeDockHeight = ({
  isPlaybackSurfaceOpen,
}: {
  isPlaybackSurfaceOpen: boolean;
}): number => {
  // Over the playback view in wide-short the piano is full screen: no height.
  const isPianoFullScreen =
    useLayoutClass() === 'wide-short' && isPlaybackSurfaceOpen;
  const pianoHeight = usePianoDockHeight();
  const stripsHeight = usePitchMonitorDockHeight() + useRecordingDockHeight();
  // The trailing panel and the floating card take none of the shell's height.
  const areStripsInPanel = useLayoutClass() === 'wide-short';

  return (
    (isPianoFullScreen ? 0 : pianoHeight) +
    (areStripsInPanel ? 0 : stripsHeight)
  );
};
