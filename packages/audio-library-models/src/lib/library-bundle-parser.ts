import { uniqBy } from 'es-toolkit';

import { parseCompositeTrack } from './composite-track.ts';
import {
  CURRENT_LIBRARY_BUNDLE_FORMAT_VERSION,
  type LibraryBundle,
  type LibraryBundleAuthor,
  type LibraryBundleComposite,
  type LibraryBundleDropCounts,
  type LibraryBundleFileLink,
  type LibraryBundleFolder,
  type LibraryBundleParseResult,
  type LibraryBundleScope,
  type LibraryBundleSource,
} from './library-bundle.ts';
import {
  isRawRecord,
  parseBundleFileLink,
  parseBundleFolder,
  parseBundleLoop,
  parseBundlePlaylist,
  parseBundleSource,
} from './library-bundle-entities.ts';
import { parseBundleRecording } from './library-bundle-recordings.ts';
import {
  upgradeLibraryBundleRecord,
  type LibraryBundleUpgradeSteps,
} from './library-bundle-upgrade.ts';

const NOT_A_BUNDLE_MESSAGE = 'This file is not a Choir LMS bundle.';
const NEWER_VERSION_MESSAGE =
  'This bundle was made by a newer version of Choir LMS. Update the app to open it.';
const UNKNOWN_AUTHOR_NAME = 'Unknown';
const MIN_FORMAT_VERSION = 1;

const refuseNotABundle = (): LibraryBundleParseResult => ({
  status: 'refused',
  reason: 'not-a-bundle',
  message: NOT_A_BUNDLE_MESSAGE,
});

const asArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const parseAuthor = (value: unknown): LibraryBundleAuthor => {
  if (!isRawRecord(value) || typeof value.name !== 'string') {
    return { name: UNKNOWN_AUTHOR_NAME };
  }

  const name = value.name.trim() || UNKNOWN_AUTHOR_NAME;

  return typeof value.email === 'string' && value.email.length > 0
    ? { name, email: value.email }
    : { name };
};

const parseScope = (value: unknown): LibraryBundleScope => {
  return isRawRecord(value) &&
    value.kind === 'folder' &&
    typeof value.name === 'string'
    ? { kind: 'folder', name: value.name }
    : { kind: 'library' };
};

/** Keeps adjusted tracks only when the track they adjust is also kept. */
const keepResolvableSources = (
  sources: LibraryBundleSource[],
): LibraryBundleSource[] => {
  const plainIds = new Set(
    sources.filter((source) => !source.adjustment).map((source) => source.id),
  );

  return sources.filter(
    (source) => !source.adjustment || plainIds.has(source.adjustment.sourceRef),
  );
};

/** Keeps folders whose whole parent chain is inside the bundle (no cycles, no strays). */
const keepReachableFolders = (
  folders: LibraryBundleFolder[],
): LibraryBundleFolder[] => {
  const kept = new Set<string>();
  let grew = true;

  while (grew) {
    grew = false;

    for (const folder of folders) {
      const parentReady =
        folder.parentFolderId === null || kept.has(folder.parentFolderId);

      if (!kept.has(folder.id) && parentReady) {
        kept.add(folder.id);
        grew = true;
      }
    }
  }

  return folders.filter((folder) => kept.has(folder.id));
};

/** Drops stems whose track is not in the bundle; a composite left with too few is dropped. */
const resolveComposite = (
  value: unknown,
  sourceIds: ReadonlySet<string>,
): LibraryBundleComposite | null => {
  const composite = parseCompositeTrack(value);

  if (composite === null) {
    return null;
  }

  const stems = composite.stems.filter((stem) => sourceIds.has(stem.trackId));
  const stemIds = new Set(stems.map((stem) => stem.id));
  const { lyricsStemId, ...rest } = composite;

  // `parseCompositeTrack` enforces the minimum on the raw stems; re-check on
  // the resolved ones by re-parsing so the rule lives in one place.
  return parseCompositeTrack({
    ...rest,
    stems,
    ...(lyricsStemId !== undefined && stemIds.has(lyricsStemId)
      ? { lyricsStemId }
      : {}),
  });
};

const countDropped = (raw: number, kept: number) => Math.max(0, raw - kept);

/**
 * Reads a bundle from text. Parsing happens once, here, at the boundary
 * (library-bundle spec): unknown fields are ignored, entities that are
 * malformed or whose references do not resolve inside the bundle are dropped
 * and counted, a newer `formatVersion` is refused before anything else is
 * read, and older versions are upgraded first.
 */
export const parseLibraryBundle = (
  text: string,
  options?: {
    upgradeSteps?: LibraryBundleUpgradeSteps;
    currentVersion?: number;
  },
): LibraryBundleParseResult => {
  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch {
    return refuseNotABundle();
  }

  if (!isRawRecord(json)) {
    return refuseNotABundle();
  }

  const version = json.formatVersion;
  const currentVersion =
    options?.currentVersion ?? CURRENT_LIBRARY_BUNDLE_FORMAT_VERSION;

  if (
    typeof version !== 'number' ||
    !Number.isInteger(version) ||
    version < MIN_FORMAT_VERSION
  ) {
    return refuseNotABundle();
  }

  if (version > currentVersion) {
    return {
      status: 'refused',
      reason: 'newer-version',
      message: NEWER_VERSION_MESSAGE,
      formatVersion: version,
    };
  }

  const record = upgradeLibraryBundleRecord(
    json,
    version,
    options?.upgradeSteps,
    currentVersion,
  );

  if (record === null || !Array.isArray(record.sources)) {
    return refuseNotABundle();
  }

  return resolveBundle(record, currentVersion);
};

const resolveBundle = (
  record: Record<string, unknown>,
  formatVersion: number,
): LibraryBundleParseResult => {
  const rawSources = asArray(record.sources);
  const rawFolders = asArray(record.folders);
  const rawLinks = asArray(record.fileLinks);
  const rawLoops = asArray(record.loops);
  const rawPlaylists = asArray(record.playlists);
  const rawComposites = asArray(record.composites);
  const rawRecordings = asArray(record.recordings);

  const sources = keepResolvableSources(
    uniqBy(
      rawSources.flatMap((entry) => parseBundleSource(entry) ?? []),
      (source) => source.id,
    ),
  );
  const sourceIds = new Set(sources.map((source) => source.id));

  const folders = keepReachableFolders(
    uniqBy(
      rawFolders.flatMap((entry) => parseBundleFolder(entry) ?? []),
      (folder) => folder.id,
    ),
  );
  const folderIds = new Set(folders.map((folder) => folder.id));

  const loops = uniqBy(
    rawLoops.flatMap((entry) => parseBundleLoop(entry) ?? []),
    (loop) => loop.id,
  ).filter((loop) => sourceIds.has(loop.sourceId));
  const loopById = new Map(loops.map((loop) => [loop.id, loop]));

  const composites = uniqBy(
    rawComposites.flatMap((entry) => resolveComposite(entry, sourceIds) ?? []),
    (composite) => composite.id,
  );
  const compositeIds = new Set(composites.map((composite) => composite.id));

  let droppedPlaylistEntries = 0;
  const playlists = uniqBy(
    rawPlaylists.flatMap((entry) => parseBundlePlaylist(entry) ?? []),
    ({ playlist }) => playlist.id,
  ).map(({ playlist, droppedEntries }) => {
    const items = playlist.items.filter((item) => {
      if (item.kind === 'composite') {
        return compositeIds.has(item.sourceId);
      }

      return (
        sourceIds.has(item.sourceId) &&
        (item.kind !== 'loop' ||
          loopById.get(item.loopId ?? '')?.sourceId === item.sourceId)
      );
    });

    droppedPlaylistEntries +=
      droppedEntries + (playlist.items.length - items.length);

    return { ...playlist, items };
  });
  const playlistIds = new Set(playlists.map((playlist) => playlist.id));

  const entityIdsByKind: Record<
    LibraryBundleFileLink['entityKind'],
    Set<string>
  > = {
    track: sourceIds,
    loop: new Set(loopById.keys()),
    composite: compositeIds,
    playlist: playlistIds,
  };
  const fileLinks = uniqBy(
    rawLinks.flatMap((entry) => parseBundleFileLink(entry) ?? []),
    (link) => link.id,
  ).filter(
    (link) =>
      entityIdsByKind[link.entityKind].has(link.entityId) &&
      (link.parentFolderId === null || folderIds.has(link.parentFolderId)),
  );

  const loopIdSet = new Set(loops.map((loop) => loop.id));
  const adjustedIds = new Set(
    sources.filter((source) => source.adjustment).map((source) => source.id),
  );
  const recordings = uniqBy(
    rawRecordings.flatMap((entry) => parseBundleRecording(entry) ?? []),
    (recording) => recording.id,
  ).filter(({ lineage }) => {
    return (
      sourceIds.has(lineage.trackId) &&
      (lineage.adjustedId === undefined ||
        adjustedIds.has(lineage.adjustedId)) &&
      (lineage.loopId === undefined || loopIdSet.has(lineage.loopId))
    );
  });

  // An entry that plays a recording is only as good as the recording it names.
  const recordingIds = new Set(recordings.map((recording) => recording.id));
  const playlistsWithRecordings = playlists.map((playlist) => {
    const items = playlist.items.filter(
      (item) =>
        item.recordingId === undefined || recordingIds.has(item.recordingId),
    );

    droppedPlaylistEntries += playlist.items.length - items.length;

    return { ...playlist, items };
  });

  const dropped: LibraryBundleDropCounts = {
    sources: countDropped(rawSources.length, sources.length),
    folders: countDropped(rawFolders.length, folders.length),
    fileLinks: countDropped(rawLinks.length, fileLinks.length),
    loops: countDropped(rawLoops.length, loops.length),
    playlists: countDropped(rawPlaylists.length, playlists.length),
    playlistEntries: droppedPlaylistEntries,
    composites: countDropped(rawComposites.length, composites.length),
    recordings: countDropped(rawRecordings.length, recordings.length),
  };
  const bundle: LibraryBundle = {
    formatVersion,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
    author: parseAuthor(record.author),
    scope: parseScope(record.scope),
    sources,
    folders,
    fileLinks,
    loops,
    playlists: playlistsWithRecordings,
    composites,
    ...(recordings.length > 0 ? { recordings } : {}),
  };

  return {
    status: 'ok',
    bundle,
    dropped,
    droppedTotal: Object.values(dropped).reduce((sum, count) => sum + count, 0),
  };
};
