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
  loop: 'repeat',
  playlist: 'playlist-music-outline',
  track: 'music-note-outline',
};

const KIND_LABELS: Record<RecentRehearsalKind, string | null> = {
  loop: 'Loop',
  playlist: 'Playlist',
  track: null,
};

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
  if (recentRehearsal.kind !== 'track') {
    return undefined;
  }

  const { source, transform } = recentRehearsal.playableItem;

  return formatDurationLabel(
    source.durationMs !== undefined && transform
      ? getAdjustedDurationMs(source.durationMs, transform.speedMultiplier)
      : source.durationMs,
  );
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
    options.isPlaying ? null : KIND_LABELS[recentRehearsal.kind],
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
