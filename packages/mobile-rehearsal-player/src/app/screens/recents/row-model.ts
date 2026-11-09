import {
  formatTransformLabel,
  getAdjustedDurationMs,
} from '@org/audio-library-models';

import type { AppIconName } from '../../components/app-icon/model';
import { formatDurationLabel } from '../../library/drive/utils/drive-library-metadata';
import {
  getRecentRehearsalLastPlayedLabel,
  type RecentRehearsalItem,
  type RecentRehearsalKind,
} from './history';

/** `active` fills the tile with the accent tint; `outline` draws its edge. */
export type RecentRowTileTone = 'active' | 'outline';

const KIND_ICONS: Record<RecentRehearsalKind, AppIconName> = {
  composite: 'tune-variant',
  loop: 'repeat',
  playlist: 'playlist-music-outline',
  track: 'music-note-outline',
};

const KIND_LABELS: Record<RecentRehearsalKind, string | null> = {
  composite: 'Composite',
  loop: 'Loop',
  playlist: 'Playlist',
  track: null,
};

const RECORDING_LABEL = 'Recording';
const PLAYING_ICON: AppIconName = 'waveform';
const PLAYING_LABEL = 'Playing now';
const META_SEPARATOR = ' · ';

export const getRecentRowPresentation = (options: {
  isPlaying: boolean;
  kind: RecentRehearsalKind;
}): { iconName: AppIconName; tileTone: RecentRowTileTone } => {
  if (options.isPlaying) {
    return { iconName: PLAYING_ICON, tileTone: 'active' };
  }

  return { iconName: KIND_ICONS[options.kind], tileTone: 'outline' };
};

const getTrackDurationLabel = (recentRehearsal: RecentRehearsalItem) => {
  // A composite's source carries the length of its longest stem.
  if (
    recentRehearsal.kind !== 'track' &&
    recentRehearsal.kind !== 'composite'
  ) {
    return undefined;
  }

  const { range, recordingId, source, transform } =
    recentRehearsal.playableItem;
  // A recording of part of a track lasts as long as that part, not the track.
  const playedMs =
    recordingId !== undefined && range.endMs !== null
      ? range.endMs - range.startMs
      : source.durationMs;

  return formatDurationLabel(
    playedMs !== undefined && transform
      ? getAdjustedDurationMs(playedMs, transform.speedMultiplier)
      : playedMs,
  );
};

/** A recording says so, since its title alone looks like any other item. */
const getKindLabel = (recentRehearsal: RecentRehearsalItem) => {
  if (recentRehearsal.kind === 'playlist') {
    return KIND_LABELS.playlist;
  }

  if (recentRehearsal.kind === 'composite') {
    // The item's description is the library badge: `Composite · 4 stems`.
    return recentRehearsal.playableItem.description || KIND_LABELS.composite;
  }

  return recentRehearsal.playableItem.recordingId !== undefined
    ? RECORDING_LABEL
    : KIND_LABELS[recentRehearsal.kind];
};

/** An adjusted track or loop shows its transform in its meta line. */
const getTransformLabel = (recentRehearsal: RecentRehearsalItem) => {
  if (recentRehearsal.kind === 'playlist') {
    return undefined;
  }

  const { transform } = recentRehearsal.playableItem;

  return transform ? formatTransformLabel(transform) : undefined;
};

/**
 * One muted meta line per row (screen 1a): the kind for loops and
 * playlists, when it was last played (or that it is playing now), and a
 * track's duration when known.
 */
export const getRecentRowMeta = (options: {
  isPlaying: boolean;
  now?: Date;
  recentRehearsal: RecentRehearsalItem;
}) => {
  const { recentRehearsal } = options;
  const parts = [
    options.isPlaying ? null : getKindLabel(recentRehearsal),
    getTransformLabel(recentRehearsal),
    options.isPlaying
      ? PLAYING_LABEL
      : getRecentRehearsalLastPlayedLabel(
          recentRehearsal.playedAt,
          options.now,
        ),
    getTrackDurationLabel(recentRehearsal),
  ];

  return parts.filter((part) => Boolean(part)).join(META_SEPARATOR);
};

export const getRecentItemCountLabel = (count: number) => {
  return `${count} ${count === 1 ? 'item' : 'items'}`;
};

/**
 * Whether a row is the one playing now. Inside a saved playlist session the
 * playlist's row is playing, not a standalone row for the same item.
 * `activePlaylistId` is null outside a saved playlist session (the transient
 * `Current queue` included), where an item's own row is the one playing.
 */
export const isRecentRowPlaying = (options: {
  activePlayableItemId: string | null;
  activePlaylistId: string | null;
  isPlaybackActive: boolean;
  recentRehearsal: RecentRehearsalItem;
}) => {
  const { recentRehearsal } = options;

  if (!options.isPlaybackActive) {
    return false;
  }

  if (recentRehearsal.kind === 'playlist') {
    return recentRehearsal.id === options.activePlaylistId;
  }

  return (
    options.activePlaylistId === null &&
    recentRehearsal.playableItem.id === options.activePlayableItemId
  );
};
