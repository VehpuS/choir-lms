import type { PianoPlayingChip } from '../../../library/piano/components/piano-overlay/piano-playing-chip';
import type { SavedTrackPlaybackState } from '../../../library/playback/utils/saved-track-playback-view-model';
import type { MiniPlayerSummary } from '../shell-model';

/**
 * What the full-screen piano's chip shows of the playing track: its title and
 * a pause (or play) control that is the shell's own toggle. Null while nothing
 * plays, so the chip is absent rather than empty.
 */
export const getPianoPlayingChip = ({
  miniPlayerSummary,
  onTogglePlayback,
  playbackState,
  playbackToggleLabel,
}: {
  miniPlayerSummary: MiniPlayerSummary | null;
  onTogglePlayback: () => void;
  playbackState: SavedTrackPlaybackState | undefined;
  playbackToggleLabel: string;
}): PianoPlayingChip | null => {
  if (!miniPlayerSummary) {
    return null;
  }

  return {
    isPlaying: playbackState === 'playing',
    onToggle: onTogglePlayback,
    title: miniPlayerSummary.title,
    toggleLabel: playbackToggleLabel,
  };
};
