import type { PlayableItem } from '@org/audio-library-models';
import { StyleSheet, View } from 'react-native';

import { SHELL_LAYERS } from '../../routing/shell/shell-layers';
import { useLayoutClass } from '../../routing/shell/layout-class';
import { PianoOverlay } from '../piano/components/piano-overlay';
import type { PianoPlayingChip } from '../piano/components/piano-overlay/piano-playing-chip';
import { resolvePianoPresentation } from '../piano/piano-overlay-model';
import { useIsPianoViewerOpen } from '../piano/piano-host-store';
import { usePianoPreferences } from '../piano/piano-preferences';
import { PitchMonitorDock } from '../pitch/components/pitch-monitor-dock';
import { RecordingDock } from '../recording/components/recording-dock';

type ShellPracticeDockProps = {
  /** The playing item and position, which the recording strip records against. */
  activePlayableItem: PlayableItem | null;
  playbackPositionSeconds: number;
  /** The playback sheet covers the shell, so the tools float over it. */
  isPlaybackSurfaceOpen: boolean;
  /** The playing track, for the chip over the full-screen piano. */
  playingChip: PianoPlayingChip | null;
};

/**
 * The shell's practice tools: the pitch monitor strip stacked above the one
 * piano. The viewer is a Modal above the shell, so it mounts its own and this
 * dock steps aside. Over the playback sheet it floats at the bottom (the sheet
 * stops above it); otherwise it docks above the mini-player and the content
 * above shrinks. It keeps one tree position either way, so opening a sheet
 * does not remount it.
 *
 * In the wide-short layout the piano is the slim compact keyboard, and the
 * pitch monitor and recording strip live in the trailing panel
 * (`PracticeToolsPanel`) instead, unless the playback view covers the shell:
 * then they float at the bottom as upright, since the panel is under it.
 */
export const ShellPracticeDock = ({
  activePlayableItem,
  isPlaybackSurfaceOpen,
  playbackPositionSeconds,
  playingChip,
}: ShellPracticeDockProps) => {
  const layoutClass = useLayoutClass();
  const presentation = resolvePianoPresentation(
    layoutClass,
    // Over the two-column playback view the keyboard cannot share the window
    // (the sheet would be squeezed and clipped), so it is full screen there.
    usePianoPreferences().isFullScreen || isPlaybackSurfaceOpen,
  );
  const isStripsInPanel =
    layoutClass === 'wide-short' && !isPlaybackSurfaceOpen;

  if (useIsPianoViewerOpen()) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={isPlaybackSurfaceOpen ? styles.floating : undefined}
    >
      {isStripsInPanel ? null : (
        <>
          <PitchMonitorDock />
          <RecordingDock
            item={activePlayableItem}
            positionSeconds={playbackPositionSeconds}
          />
        </>
      )}
      <PianoOverlay
        canExitFullScreen={!isPlaybackSurfaceOpen}
        playingChip={playingChip}
        presentation={presentation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: SHELL_LAYERS.floatingPracticeDock,
  },
});
