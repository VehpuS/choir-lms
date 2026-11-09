import {
  CURRENT_LIBRARY_BUNDLE_FORMAT_VERSION,
  type LibraryBundle,
  type LibraryBundleAuthor,
  type LibraryBundleFileLink,
  type LibraryBundleFolder,
  type LibraryBundleOwner,
  type LibraryBundlePlaylist,
  type Recording,
  type RehearsalLibraryEntityKind,
} from '@org/audio-library-models';

import {
  buildComposite,
  buildLoop,
  buildRecording,
  buildSource,
} from './library-bundle-entity-builders.ts';
import {
  isEntryInScope,
  selectLibraryBundleContents,
  type LibraryBundleInput,
  type LibraryBundleSelectionScope,
} from './library-bundle-selection.ts';

export type BuildLibraryBundleOptions = {
  input: LibraryBundleInput;
  scope: LibraryBundleSelectionScope;
  author: LibraryBundleAuthor;
  createdAt: string;
  /** Drive owners by `driveFileId`, looked up at export; absent when unknown. */
  ownersByDriveFileId?: Readonly<Record<string, LibraryBundleOwner>>;
  /** Folder scope: also include the outside items the folder's playlists refer to. */
  includeOutsideReferences?: boolean;
  /** Every recording the device has; only the selected ones are written. */
  recordings?: readonly Recording[];
  /** Recordings the user chose to include; none by default (library-bundle spec). */
  selectedRecordingIds?: ReadonlySet<string>;
};

export type BuildLibraryBundleResult = {
  bundle: LibraryBundle;
  /** `N references to items outside this folder were left out`. */
  leftOutReferenceCount: number;
  /** Outside tracks and composites added by `includeOutsideReferences`. */
  includedOutsideItemCount: number;
  /** Included recordings whose audio has no Drive copy; the writer uploads them. */
  recordingsToUpload: {
    /** The id in the bundle. */
    id: string;
    /** The recording's own id, to read its audio. */
    recordingId: string;
    sizeBytes: number;
  }[];
  /** Total audio bytes the writer would upload, shown before anything uploads. */
  uploadSizeBytes: number;
};

/** Hands out `<prefix>1`, `<prefix>2`, ... so ids are stable for a given library. */
const createIdMap = (prefix: string) => {
  const ids = new Map<string, string>();

  return {
    assign: (libraryId: string) => {
      const existing = ids.get(libraryId);

      if (existing !== undefined) {
        return existing;
      }

      const bundleId = `${prefix}${ids.size + 1}`;

      ids.set(libraryId, bundleId);

      return bundleId;
    },
    get: (libraryId: string) => ids.get(libraryId),
  };
};

/**
 * Builds a bundle of the whole library or of one folder subtree. Every entity
 * is re-keyed to a bundle-local id and every cross reference rewritten, so the
 * bundle holds no id of this device (library-bundle spec).
 */
export const buildLibraryBundle = (
  options: BuildLibraryBundleOptions,
): BuildLibraryBundleResult => {
  const { input, scope } = options;
  const selection = selectLibraryBundleContents(input, scope, {
    includeOutsideReferences: options.includeOutsideReferences,
  });
  const sourceIds = createIdMap('s');
  const loopIds = createIdMap('l');
  const playlistIds = createIdMap('p');
  const compositeIds = createIdMap('c');
  const folderIds = createIdMap('f');
  const linkIds = createIdMap('k');

  for (const source of selection.sources) sourceIds.assign(source.id);
  for (const loop of selection.loops) loopIds.assign(loop.id);
  for (const playlist of selection.playlists) playlistIds.assign(playlist.id);
  for (const composite of selection.composites)
    compositeIds.assign(composite.id);
  for (const folder of selection.folders) folderIds.assign(folder.id);

  const toBundleFolderId = (libraryFolderId: string): string | null => {
    return libraryFolderId === selection.rootFolderId
      ? null
      : (folderIds.get(libraryFolderId) ?? null);
  };
  const entityIdFor = (kind: RehearsalLibraryEntityKind, id: string) => {
    const maps = {
      track: sourceIds,
      loop: loopIds,
      playlist: playlistIds,
      composite: compositeIds,
    };

    return maps[kind].get(id) ?? '';
  };

  const sourceIdSet = new Set(selection.sources.map((source) => source.id));
  const loopIdSet = new Set(selection.loops.map((loop) => loop.id));
  const compositeIdSet = new Set(
    selection.composites.map((composite) => composite.id),
  );
  const sourceIdMap = new Map(
    selection.sources.map((source) => [
      source.id,
      sourceIds.get(source.id) ?? '',
    ]),
  );

  const folders: LibraryBundleFolder[] = selection.folders.map((folder) => ({
    id: folderIds.get(folder.id) ?? '',
    name: folder.name,
    parentFolderId: toBundleFolderId(folder.parentFolderId ?? ''),
    ...(folder.tags !== undefined ? { tags: folder.tags } : {}),
    ...(folder.tagAddedAt !== undefined
      ? { tagAddedAt: folder.tagAddedAt }
      : {}),
    createdAt: folder.createdAt,
  }));

  const playlists: LibraryBundlePlaylist[] = selection.playlists.map(
    (playlist) => ({
      id: playlistIds.get(playlist.id) ?? '',
      name: playlist.name,
      ...(playlist.tags !== undefined ? { tags: playlist.tags } : {}),
      ...(playlist.tagAddedAt !== undefined
        ? { tagAddedAt: playlist.tagAddedAt }
        : {}),
      items: playlist.items
        .filter((entry) =>
          isEntryInScope(entry, sourceIdSet, loopIdSet, compositeIdSet),
        )
        .map((entry, index) => ({
          id: `${playlistIds.get(playlist.id)}-e${index + 1}`,
          sortIndex: index,
          kind: entry.kind,
          sourceId:
            entry.kind === 'composite'
              ? (compositeIds.get(entry.sourceId) ?? '')
              : (sourceIds.get(entry.sourceId) ?? ''),
          ...(entry.kind === 'loop' && entry.loopId !== undefined
            ? { loopId: loopIds.get(entry.loopId) ?? '' }
            : {}),
          title: entry.title,
          ...(entry.description !== undefined
            ? { description: entry.description }
            : {}),
          createdAt: entry.createdAt,
        })),
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    }),
  );

  const fileLinks: LibraryBundleFileLink[] = [
    ...selection.fileLinks.map((link) => ({
      id: linkIds.assign(link.id),
      parentFolderId: toBundleFolderId(link.parentFolderId),
      entityKind: link.entityKind,
      entityId: entityIdFor(link.entityKind, link.entityId),
      ...(link.visibleName !== undefined
        ? { visibleName: link.visibleName }
        : {}),
    })),
    // Dependents pulled in from elsewhere get a link at the top of the bundle.
    ...selection.unlinked.map(({ kind, id }) => ({
      id: linkIds.assign(`unlinked:${kind}:${id}`),
      parentFolderId: null,
      entityKind: kind,
      entityId: entityIdFor(kind, id),
    })),
  ];

  const loopIdMap = new Map(
    selection.loops.map((loop) => [loop.id, loopIds.get(loop.id) ?? '']),
  );
  const selected = options.selectedRecordingIds ?? new Set<string>();
  const builtRecordings = (options.recordings ?? [])
    .filter((recording) => selected.has(recording.id))
    .flatMap((recording, index) => {
      const built = buildRecording(recording, `r${index + 1}`, {
        sources: sourceIdMap,
        loops: loopIdMap,
      });

      return built ? [{ built, recordingId: recording.id }] : [];
    });
  const recordings = builtRecordings.map(({ built }) => built);
  const recordingsToUpload = builtRecordings
    .filter(({ built }) => built.audio.kind === 'not-uploaded')
    .map(({ built, recordingId }) => ({
      id: built.id,
      recordingId,
      sizeBytes: built.sizeBytes,
    }));

  const bundle: LibraryBundle = {
    formatVersion: CURRENT_LIBRARY_BUNDLE_FORMAT_VERSION,
    createdAt: options.createdAt,
    author: options.author,
    scope:
      scope.kind === 'library'
        ? { kind: 'library' }
        : {
            kind: 'folder',
            name:
              input.tree.folders.find((folder) => folder.id === scope.folderId)
                ?.name ?? '',
          },
    sources: selection.sources.map((source) =>
      buildSource(
        source,
        sourceIds.get(source.id) ?? '',
        sourceIdMap,
        options.ownersByDriveFileId?.[source.driveFileId],
      ),
    ),
    folders,
    fileLinks,
    loops: selection.loops.map((loop) =>
      buildLoop(
        loop,
        loopIds.get(loop.id) ?? '',
        sourceIds.get(loop.sourceId) ?? '',
      ),
    ),
    playlists,
    composites: selection.composites.map((composite) =>
      buildComposite(
        composite,
        compositeIds.get(composite.id) ?? '',
        sourceIdMap,
      ),
    ),
    ...(recordings.length > 0 ? { recordings } : {}),
  };

  return {
    bundle,
    leftOutReferenceCount: selection.leftOutReferenceCount,
    includedOutsideItemCount: selection.includedOutsideItemCount,
    recordingsToUpload,
    uploadSizeBytes: recordingsToUpload.reduce(
      (total, { sizeBytes }) => total + sizeBytes,
      0,
    ),
  };
};
