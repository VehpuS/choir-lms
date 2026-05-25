import type { PlayableItem } from '@org/audio-library-models';

import { formatDurationLabel } from '../library/utils/drive-library-view-model';
import {
  getPlaylistPlaybackSessionSummary,
  type PlaylistPlaybackSession,
} from '../library/utils/saved-playlist-playback-view-model';
import type { SavedTrackPlaybackState } from '../library/utils/saved-track-playback-view-model';

export type ShellDestinationKey = 'home' | 'search' | 'library';

export type ShellDestination = {
  description: string;
  key: ShellDestinationKey;
  label: string;
  title: string;
};

export type MiniPlayerSummary = {
  detail: string;
  status: string;
  title: string;
};

export const SHELL_DESTINATIONS: ShellDestination[] = [
  {
    key: 'home',
    label: 'Home',
    title: 'Practice home base',
    description:
      'Start from Drive discovery, keep the Google connection visible, and stay close to the active rehearsal session without mixing in the full saved library.',
  },
  {
    key: 'search',
    label: 'Search',
    title: 'Search rehearsal audio',
    description:
      'Search across accessible rehearsal audio, scan results quickly, and save promising tracks into Library without leaving the result flow.',
  },
  {
    key: 'library',
    label: 'Library',
    title: 'Your rehearsal library',
    description:
      'Keep saved tracks and loops separate from discovery so personal practice material stays focused and playback actions remain close at hand.',
  },
];

const getPlaybackStatusLabel = (options: {
  isPlaybackPreparing: boolean;
  playbackState: SavedTrackPlaybackState | undefined;
}) => {
  if (options.isPlaybackPreparing) {
    return 'Loading';
  }

  if (options.playbackState === 'playing') {
    return 'Playing';
  }

  if (options.playbackState === 'paused') {
    return 'Paused';
  }

  if (options.playbackState === 'ended') {
    return 'Ended';
  }

  if (options.playbackState === 'error') {
    return 'Needs attention';
  }

  return 'Ready';
};

export const getMiniPlayerSummary = (options: {
  activePlayableItem: PlayableItem | null;
  activePlaylistSession?: PlaylistPlaybackSession | null;
  isPlaybackPreparing: boolean;
  playbackPositionSeconds: number;
  playbackState: SavedTrackPlaybackState | undefined;
}): MiniPlayerSummary | null => {
  if (!options.activePlayableItem) {
    return null;
  }

  const status = getPlaybackStatusLabel(options);
  const positionLabel =
    formatDurationLabel(Math.round(options.playbackPositionSeconds * 1000)) ??
    '0:00';

  return {
    title: options.activePlayableItem.title,
    status: `${status} • ${positionLabel}`,
    detail: options.activePlaylistSession
      ? `${getPlaylistPlaybackSessionSummary(options.activePlaylistSession)} Focused now-playing and queue controls land in the later playback slice.`
      : `${status} stays available while you move between Home, Search, and Library. Focused now-playing and queue controls land in the later playback slice.`,
  };
};
