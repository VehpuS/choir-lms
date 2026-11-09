import { isLoopPreviewItem } from '../../library/playback/utils/loop-preview-item';
import type { PlayableItem } from '@org/audio-library-models';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecentRehearsalKind = 'track' | 'loop' | 'composite' | 'playlist';

/** A single track, loop or composite that can be played on its own. */
export type RecentPlayableRehearsalItem = {
  id: string;
  kind: Exclude<RecentRehearsalKind, 'playlist'>;
  playedAt: string;
  playableItem: PlayableItem;
  title: string;
};

/**
 * A saved playlist, one row however many of its tracks have played. It has no
 * `playableItem`: resuming it restarts the playlist session, not one track.
 */
export type RecentPlaylistRehearsalItem = {
  id: string;
  kind: 'playlist';
  lastEntryId: string;
  playedAt: string;
  playlistName: string;
  /** The playlist name, so row code that shows a title keeps working. */
  title: string;
};

export type RecentRehearsalItem =
  | RecentPlayableRehearsalItem
  | RecentPlaylistRehearsalItem;

type RecentRehearsalStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'removeItem' | 'setItem'
>;

type BuildRecentRehearsalItemOptions = {
  activePlayableItem: PlayableItem;
  playedAt: string;
};

type BuildRecentPlaylistItemOptions = {
  lastEntryId: string;
  playedAt: string;
  playlistId: string;
  playlistName: string;
};

const MAX_RECENT_REHEARSAL_ITEMS = 5;
const RECENT_REHEARSAL_HISTORY_KEY = 'choirlms.recents.history';
const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readString = (value: unknown) => {
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const readPlayableItem = (value: unknown): PlayableItem | null => {
  if (!isRecord(value) || !isRecord(value.range)) {
    return null;
  }

  const id = readString(value.id);
  const title = readString(value.title);
  const sourceId = readString(value.sourceId);
  const kind = readString(value.kind);

  if (!id || !title || !sourceId) {
    return null;
  }

  if (kind !== 'track' && kind !== 'loop' && kind !== 'composite') {
    return null;
  }

  const startMs = value.range.startMs;
  const endMs = value.range.endMs;

  if (typeof startMs !== 'number') {
    return null;
  }

  if (endMs !== null && typeof endMs !== 'number') {
    return null;
  }

  return value as PlayableItem;
};

const parseRecentPlaylistItem = (
  value: Record<string, unknown>,
): RecentPlaylistRehearsalItem | null => {
  const id = readString(value.id);
  const playlistName = readString(value.playlistName);
  const lastEntryId = readString(value.lastEntryId);
  const playedAt = readString(value.playedAt);

  // Per-track `playlist` rows from before playlists became recent entries
  // carry a `playableItem` and no `lastEntryId`, so they fail here and drop.
  if (!id || !playlistName || !lastEntryId || !playedAt) {
    return null;
  }

  return {
    id,
    kind: 'playlist',
    lastEntryId,
    playedAt,
    playlistName,
    title: playlistName,
  };
};

const parseRecentPlayableItem = (
  value: Record<string, unknown>,
): RecentPlayableRehearsalItem | null => {
  const playableItem = readPlayableItem(value.playableItem);
  const id = readString(value.id);
  const title = readString(value.title);
  const playedAt = readString(value.playedAt);

  if (!playableItem || !id || !title || !playedAt) {
    return null;
  }

  return {
    id,
    kind: playableItem.kind,
    playedAt,
    playableItem,
    title,
  };
};

const parseRecentRehearsalItem = (
  value: unknown,
): RecentRehearsalItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  return value.kind === 'playlist'
    ? parseRecentPlaylistItem(value)
    : parseRecentPlayableItem(value);
};

export const buildRecentRehearsalItem = (
  options: BuildRecentRehearsalItemOptions,
): RecentPlayableRehearsalItem => {
  return {
    id: options.activePlayableItem.id,
    kind: options.activePlayableItem.kind,
    playedAt: options.playedAt,
    playableItem: options.activePlayableItem,
    title: options.activePlayableItem.title,
  };
};

export const buildRecentPlaylistItem = (
  options: BuildRecentPlaylistItemOptions,
): RecentPlaylistRehearsalItem => {
  return {
    id: options.playlistId,
    kind: 'playlist',
    lastEntryId: options.lastEntryId,
    playedAt: options.playedAt,
    playlistName: options.playlistName,
    title: options.playlistName,
  };
};

/**
 * Records a playlist run: replaces the playlist's entry by id, moves it to the
 * front and keeps the cap. Only playlist rows are replaced, so a track whose id
 * happened to match never evicts it.
 */
export const upsertRecentPlaylist = (
  currentHistory: RecentRehearsalItem[],
  nextItem: RecentPlaylistRehearsalItem,
) => {
  const otherItems = currentHistory.filter((item) => {
    return item.kind !== 'playlist' || item.id !== nextItem.id;
  });

  return [nextItem, ...otherItems].slice(0, MAX_RECENT_REHEARSAL_ITEMS);
};

export const appendRecentRehearsalItem = (
  currentHistory: RecentRehearsalItem[],
  nextItem: RecentRehearsalItem,
) => {
  if (nextItem.kind === 'playlist') {
    return upsertRecentPlaylist(currentHistory, nextItem);
  }

  // Playlist rows share the id space of playlists, not of playable items.
  const deduplicatedHistory = currentHistory.filter((item) => {
    return item.kind === 'playlist' || item.id !== nextItem.id;
  });

  return [nextItem, ...deduplicatedHistory].slice(
    0,
    MAX_RECENT_REHEARSAL_ITEMS,
  );
};

export const restoreRecentRehearsalHistory = async (
  storage: RecentRehearsalStorage = AsyncStorage,
) => {
  const storedValue = await storage.getItem(RECENT_REHEARSAL_HISTORY_KEY);

  if (!storedValue) {
    return [] as RecentRehearsalItem[];
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [] as RecentRehearsalItem[];
    }

    return (
      parsedValue
        .map(parseRecentRehearsalItem)
        .filter((item): item is RecentRehearsalItem => item !== null)
        // Previews recorded before they were excluded (task 8.95).
        .filter(
          (item) =>
            item.kind === 'playlist' || !isLoopPreviewItem(item.playableItem),
        )
        .slice(0, MAX_RECENT_REHEARSAL_ITEMS)
    );
  } catch {
    return [] as RecentRehearsalItem[];
  }
};

export const persistRecentRehearsalHistory = async (
  history: RecentRehearsalItem[],
  storage: RecentRehearsalStorage = AsyncStorage,
) => {
  if (history.length === 0) {
    await storage.removeItem(RECENT_REHEARSAL_HISTORY_KEY);
    return;
  }

  await storage.setItem(
    RECENT_REHEARSAL_HISTORY_KEY,
    JSON.stringify(history.slice(0, MAX_RECENT_REHEARSAL_ITEMS)),
  );
};

const getCalendarLastPlayedLabel = (playedAtDate: Date, now: Date) => {
  const sameYear = playedAtDate.getFullYear() === now.getFullYear();

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(playedAtDate);
};

export const getRecentRehearsalLastPlayedLabel = (
  playedAt: string,
  now: Date = new Date(),
) => {
  const playedAtDate = new Date(playedAt);

  if (Number.isNaN(playedAtDate.valueOf()) || Number.isNaN(now.valueOf())) {
    return 'Last played recently';
  }

  const elapsedMs = now.getTime() - playedAtDate.getTime();

  if (elapsedMs < 0) {
    return `Last played ${getCalendarLastPlayedLabel(playedAtDate, now)}`;
  }

  if (elapsedMs < MINUTE_IN_MS) {
    return 'Last played just now';
  }

  if (elapsedMs < HOUR_IN_MS) {
    return `Last played ${Math.floor(elapsedMs / MINUTE_IN_MS)} min ago`;
  }

  if (elapsedMs < DAY_IN_MS) {
    return `Last played ${Math.floor(elapsedMs / HOUR_IN_MS)} hr ago`;
  }

  return `Last played ${getCalendarLastPlayedLabel(playedAtDate, now)}`;
};
