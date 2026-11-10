import { isString, uniqBy } from 'es-toolkit';

import { parseSourceAdjustment } from './adjusted-entities.ts';
import { isDriveSourceLocation } from './drive-source-location.ts';
import type {
  LibraryBundleFileLink,
  LibraryBundleFolder,
  LibraryBundleLoop,
  LibraryBundleOwner,
  LibraryBundlePlaylist,
  LibraryBundlePlaylistEntry,
  LibraryBundleSource,
} from './library-bundle.ts';
import {
  isPlaybackShapingNeutral,
  normalizePlaybackShaping,
} from './playback-shaping.ts';
import type {
  PlayableItemKind,
  RehearsalLibraryEntityKind,
} from './rehearsal-domain.ts';
import { normalizeLibraryEntityTags } from './rehearsal-tags.ts';
import { parseSourceLyrics } from './source-lyrics.ts';
import { parseSourceSheetMusic } from './source-sheet-music.ts';
import { parseTrackMarkers } from './track-markers.ts';

/**
 * Field-level parsers for bundle entities. They check shape only; whether a
 * reference resolves inside the bundle is decided by the bundle parser, which
 * sees every entity at once.
 */

type RawRecord = Record<string, unknown>;

const PLAYABLE_KINDS: readonly PlayableItemKind[] = [
  'track',
  'loop',
  'composite',
];
const ENTITY_KINDS: readonly RehearsalLibraryEntityKind[] = [
  ...PLAYABLE_KINDS,
  'playlist',
];

export const isRawRecord = (value: unknown): value is RawRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isNonEmptyString = (value: unknown): value is string => {
  return isString(value) && value.trim().length > 0;
};

const optionalNumber = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
};

const parseTags = (record: RawRecord) => {
  const tags = Array.isArray(record.tags)
    ? normalizeLibraryEntityTags(record.tags.filter(isString))
    : [];
  const tagAddedAt: Record<string, string> = {};

  if (isRawRecord(record.tagAddedAt)) {
    for (const [tag, addedAt] of Object.entries(record.tagAddedAt)) {
      if (tags.includes(tag) && isString(addedAt)) {
        tagAddedAt[tag] = addedAt;
      }
    }
  }

  return {
    ...(tags.length > 0 ? { tags } : {}),
    ...(Object.keys(tagAddedAt).length > 0 ? { tagAddedAt } : {}),
  };
};

const createdAtOf = (record: RawRecord) => {
  return isString(record.createdAt) ? record.createdAt : '';
};

export const parseBundleOwner = (
  value: unknown,
): LibraryBundleOwner | undefined => {
  if (!isRawRecord(value)) {
    return undefined;
  }

  const name = isNonEmptyString(value.name) ? value.name : undefined;
  const email = isNonEmptyString(value.email) ? value.email : undefined;

  return name || email
    ? { ...(name ? { name } : {}), ...(email ? { email } : {}) }
    : undefined;
};

export const parseBundleSource = (
  value: unknown,
): LibraryBundleSource | null => {
  if (
    !isRawRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.driveFileId) ||
    !isNonEmptyString(value.name)
  ) {
    return null;
  }

  const hasAdjustment = value.adjustment !== undefined;
  const adjustment = parseSourceAdjustment(value.adjustment);

  // An adjustment that cannot be read must not turn into a plain track.
  if (hasAdjustment && adjustment === null) {
    return null;
  }

  const lyrics = parseSourceLyrics(value.lyrics);
  const sheetMusic = parseSourceSheetMusic(value.sheetMusic);
  const markers = parseTrackMarkers(value.markers);
  const owner = parseBundleOwner(value.owner);

  return {
    id: value.id,
    driveFileId: value.driveFileId,
    name: value.name,
    mimeType: isString(value.mimeType) ? value.mimeType : '',
    ...(isNonEmptyString(value.extension)
      ? { extension: value.extension }
      : {}),
    ...withNumber('durationMs', value.durationMs),
    ...withNumber('sizeBytes', value.sizeBytes),
    ...(isString(value.modifiedTime)
      ? { modifiedTime: value.modifiedTime }
      : {}),
    ...parseTags(value),
    ...(lyrics ? { lyrics } : {}),
    ...(sheetMusic ? { sheetMusic } : {}),
    ...(markers ? { markers } : {}),
    ...(isDriveSourceLocation(value.sourceLocation)
      ? { sourceLocation: value.sourceLocation }
      : {}),
    ...(adjustment ? { adjustment } : {}),
    ...(owner ? { owner } : {}),
    createdAt: createdAtOf(value),
  };
};

const withNumber = <Key extends string>(key: Key, value: unknown) => {
  const parsed = optionalNumber(value);

  return parsed === undefined ? {} : ({ [key]: parsed } as Record<Key, number>);
};

export const parseBundleFolder = (
  value: unknown,
): LibraryBundleFolder | null => {
  if (
    !isRawRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    (value.parentFolderId !== null && !isNonEmptyString(value.parentFolderId))
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    parentFolderId: value.parentFolderId,
    ...parseTags(value),
    createdAt: createdAtOf(value),
  };
};

export const parseBundleFileLink = (
  value: unknown,
): LibraryBundleFileLink | null => {
  if (
    !isRawRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.entityId) ||
    !ENTITY_KINDS.includes(value.entityKind as RehearsalLibraryEntityKind) ||
    (value.parentFolderId !== null && !isNonEmptyString(value.parentFolderId))
  ) {
    return null;
  }

  return {
    id: value.id,
    parentFolderId: value.parentFolderId,
    entityKind: value.entityKind as RehearsalLibraryEntityKind,
    entityId: value.entityId,
    ...(isNonEmptyString(value.visibleName)
      ? { visibleName: value.visibleName }
      : {}),
  };
};

export const parseBundleLoop = (value: unknown): LibraryBundleLoop | null => {
  const startMs = isRawRecord(value)
    ? optionalNumber(value.startMs)
    : undefined;
  const endMs = isRawRecord(value) ? optionalNumber(value.endMs) : undefined;

  if (
    !isRawRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.sourceId) ||
    startMs === undefined ||
    endMs === undefined ||
    startMs < 0 ||
    endMs <= startMs
  ) {
    return null;
  }

  const transform =
    value.transform === undefined
      ? undefined
      : normalizePlaybackShaping(value.transform);
  const createdAt = createdAtOf(value);

  return {
    id: value.id,
    name: value.name,
    sourceId: value.sourceId,
    sourceName: isString(value.sourceName) ? value.sourceName : '',
    ...parseTags(value),
    startMs,
    endMs,
    ...(transform && !isPlaybackShapingNeutral(transform) ? { transform } : {}),
    createdAt,
    updatedAt: isString(value.updatedAt) ? value.updatedAt : createdAt,
  };
};

const parsePlaylistEntry = (
  value: unknown,
): LibraryBundlePlaylistEntry | null => {
  if (
    !isRawRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.sourceId) ||
    !PLAYABLE_KINDS.includes(value.kind as PlayableItemKind) ||
    (value.recordingId !== undefined && !isNonEmptyString(value.recordingId))
  ) {
    return null;
  }

  const kind = value.kind as PlayableItemKind;

  if (kind === 'loop' && !isNonEmptyString(value.loopId)) {
    return null;
  }

  return {
    id: value.id,
    sortIndex: optionalNumber(value.sortIndex) ?? 0,
    kind,
    sourceId: value.sourceId,
    ...(kind === 'loop' && isNonEmptyString(value.loopId)
      ? { loopId: value.loopId }
      : {}),
    ...(isNonEmptyString(value.recordingId)
      ? { recordingId: value.recordingId }
      : {}),
    title: isString(value.title) ? value.title : '',
    ...(isString(value.description) ? { description: value.description } : {}),
    createdAt: createdAtOf(value),
  };
};

/** A playlist with its entries read and the unreadable ones counted. */
export const parseBundlePlaylist = (
  value: unknown,
): { playlist: LibraryBundlePlaylist; droppedEntries: number } | null => {
  if (
    !isRawRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.name)
  ) {
    return null;
  }

  const rawEntries = Array.isArray(value.items) ? value.items : [];
  const entries = uniqBy(
    rawEntries.flatMap((entry) => parsePlaylistEntry(entry) ?? []),
    (entry) => entry.id,
  );
  const createdAt = createdAtOf(value);

  return {
    droppedEntries: rawEntries.length - entries.length,
    playlist: {
      id: value.id,
      name: value.name,
      ...parseTags(value),
      items: entries,
      createdAt,
      updatedAt: isString(value.updatedAt) ? value.updatedAt : createdAt,
    },
  };
};
