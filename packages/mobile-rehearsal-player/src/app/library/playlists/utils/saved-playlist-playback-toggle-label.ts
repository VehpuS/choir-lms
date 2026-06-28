import type { SavedTrackPlaybackState } from '../../playback/utils/saved-track-playback-view-model';

export const getSavedPlaylistPlaybackToggleLabel = (options: {
  isPlaybackPreparing: boolean;
  playbackState: SavedTrackPlaybackState | undefined;
}) => {
  if (options.isPlaybackPreparing) {
    return 'Loading…';
  }

  if (options.playbackState === 'playing') {
    return 'Pause';
  }

  if (
    options.playbackState === 'paused' ||
    options.playbackState === 'ready' ||
    options.playbackState === 'stopped'
  ) {
    return 'Resume';
  }

  if (options.playbackState === 'ended') {
    return 'Replay';
  }

  return 'Play';
};
