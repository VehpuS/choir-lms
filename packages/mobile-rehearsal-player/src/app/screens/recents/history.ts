import type { PlayableItem } from '@org/audio-library-models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaylistPlaybackSession } from '../../library/playlists/utils/saved-playlist-playback-view-model';

export type RecentRehearsalKind = 'track' | 'loop' | 'playlist';

export type RecentRehearsalItem = {
  id: string;
  kind: RecentRehearsalKind;
  playedAt: string;
  playableItem: PlayableItem;
  playlistName: string | null;
  title: string;
};

type RecentRehearsalStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'removeItem' | 'setItem'
>;

type BuildRecentRehearsalItemOptions = {
  activePlayableItem: PlayableItem;
  activePlaylistSession: PlaylistPlaybackSession | null;
  playedAt: string;
};

const MAX_RECENT_REHEARSAL_ITEMS = 5;
const RECENT_REHEARSAL_HISTORY_KEY = 'choirlms.recents.history';

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

  if (kind !== 'track' && kind !== 'loop') {
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

const parseRecentRehearsalItem = (
  value: unknown,
): RecentRehearsalItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  const playableItem = readPlayableItem(value.playableItem);
  const id = readString(value.id);
  const title = readString(value.title);
  const playedAt = readString(value.playedAt);

  if (!playableItem || !id || !title || !playedAt) {
    return null;
  }

  const playlistName = readString(value.playlistName);
  const kind = readString(value.kind);

  return {
    id,
    kind:
      kind === 'playlist' || kind === 'track' || kind === 'loop'
        ? kind
        : playableItem.kind,
    playedAt,
    playableItem,
    playlistName,
    title,
  };
};

const getRecentRehearsalItemId = (options: {
  activePlayableItem: PlayableItem;
  activePlaylistSession: PlaylistPlaybackSession | null;
}) => {
  const playlistId = options.activePlaylistSession?.playlistId;
  const playlistEntryId = options.activePlayableItem.playlistEntryId;

  if (playlistId && playlistEntryId) {
    return `${playlistId}:${playlistEntryId}`;
  }

  return options.activePlayableItem.id;
};

export const buildRecentRehearsalItem = (
  options: BuildRecentRehearsalItemOptions,
): RecentRehearsalItem => {
  return {
    id: getRecentRehearsalItemId(options),
    kind: options.activePlaylistSession
      ? 'playlist'
      : options.activePlayableItem.kind,
    playedAt: options.playedAt,
    playableItem: options.activePlayableItem,
    playlistName: options.activePlaylistSession?.playlistName ?? null,
    title: options.activePlayableItem.title,
  };
};

export const appendRecentRehearsalItem = (
  currentHistory: RecentRehearsalItem[],
  nextItem: RecentRehearsalItem,
) => {
  const deduplicatedHistory = currentHistory.filter((item) => {
    return item.id !== nextItem.id;
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

    return parsedValue
      .map(parseRecentRehearsalItem)
      .filter((item): item is RecentRehearsalItem => item !== null)
      .slice(0, MAX_RECENT_REHEARSAL_ITEMS);
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

export const getRecentRehearsalLastPlayedLabel = (playedAt: string) => {
  const playedAtDate = new Date(playedAt);

  if (Number.isNaN(playedAtDate.valueOf())) {
    return 'Last played recently';
  }

  return `Last played ${playedAtDate.toLocaleString()}`;
};
