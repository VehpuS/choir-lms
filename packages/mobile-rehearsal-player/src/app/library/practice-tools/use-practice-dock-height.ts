import { useLayoutClass } from '../../routing/shell/layout-class';
import { usePianoDockHeight } from '../piano/use-piano-dock-height';
import { usePitchMonitorDockHeight } from '../pitch/components/pitch-monitor-dock';
import { useRecordingDockHeight } from '../recording/components/recording-dock';

/**
 * How tall the open practice tools are together at the bottom of the shell, or
 * 0 when none is open. In the wide-short layout the pitch monitor and the
 * recording strip sit in the trailing panel and take no height, except over
 * the playback view (`isPlaybackSurfaceOpen`), where they float at the bottom.
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
  const areStripsInPanel =
    useLayoutClass() === 'wide-short' && !isPlaybackSurfaceOpen;

  return (
    (isPianoFullScreen ? 0 : pianoHeight) +
    (areStripsInPanel ? 0 : stripsHeight)
  );
};
