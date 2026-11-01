import type { PlayableItem } from '@org/audio-library-models';
import { StyleSheet, View } from 'react-native';

import { PianoOverlay } from '../piano/components/piano-overlay';
import { useIsPianoViewerOpen } from '../piano/piano-host-store';
import { PitchMonitorDock } from '../pitch/components/pitch-monitor-dock';
import { RecordingDock } from '../recording/components/recording-dock';

type ShellPracticeDockProps = {
  /** The playing item and position, which the recording strip records against. */
  activePlayableItem: PlayableItem | null;
  playbackPositionSeconds: number;
  /** The playback sheet covers the shell, so the tools float over it. */
  isPlaybackSurfaceOpen: boolean;
};

/**
 * The shell's practice tools: the pitch monitor strip stacked above the one
 * piano. The viewer is a Modal above the shell, so it mounts its own and this
 * dock steps aside. Over the playback sheet it floats at the bottom (the sheet
 * stops above it); otherwise it docks above the mini-player and the content
 * above shrinks. It keeps one tree position either way, so opening a sheet
 * does not remount it.
 */
export const ShellPracticeDock = ({
  activePlayableItem,
  isPlaybackSurfaceOpen,
  playbackPositionSeconds,
}: ShellPracticeDockProps) => {
  if (useIsPianoViewerOpen()) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={isPlaybackSurfaceOpen ? styles.floating : undefined}
    >
      <PitchMonitorDock />
      <RecordingDock
        item={activePlayableItem}
        positionSeconds={playbackPositionSeconds}
      />
      <PianoOverlay />
    </View>
  );
};

// Above the playback sheet, which sits at zIndex 15.
const PLAYBACK_SHEET_Z_INDEX = 15;

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: PLAYBACK_SHEET_Z_INDEX + 5,
  },
});
