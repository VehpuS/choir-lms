import type {
  CompositeTrack,
  DriveAudioSource,
  NamedLoop,
  Playlist,
  RehearsalLibraryEntityKind,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import { MIN_COMPOSITE_STEMS } from '@org/audio-library-models';

/**
 * Decides which library entities a bundle holds (library-bundle spec: a
 * folder bundle includes the dependents of its contents). Pure over library
 * state; the builder re-keys what this selects.
 */

export type LibraryBundleInput = {
  sources: readonly DriveAudioSource[];
  loops: readonly NamedLoop[];
  playlists: readonly Playlist[];
  composites: readonly CompositeTrack[];
  tree: RehearsalLibraryFileTree;
};

export type LibraryBundleSelectionScope =
  | { kind: 'library' }
  | { kind: 'folder'; folderId: string };

export type LibraryBundleSelection = {
  /** The folder whose contents sit at the top of the bundle. */
  rootFolderId: string;
  /** Folders beneath the root, in tree order. */
  folders: RehearsalLibraryFolderNode[];
  sources: DriveAudioSource[];
  loops: NamedLoop[];
  playlists: Playlist[];
  /** Composites with only their in-scope stems. */
  composites: CompositeTrack[];
  /** Links whose entity is selected; `parentFolderId` is a library id. */
  fileLinks: RehearsalLibraryFileLinkNode[];
  /** Selected entities with no link in the subtree; the builder links them at the top. */
  unlinked: { kind: RehearsalLibraryEntityKind; id: string }[];
  /** References to items outside the scope that were removed or left out. */
  leftOutReferenceCount: number;
};

const collectSubtree = (
  tree: RehearsalLibraryFileTree,
  rootFolderId: string,
): Set<string> => {
  const ids = new Set([rootFolderId]);
  let grew = true;

  while (grew) {
    grew = false;

    for (const folder of tree.folders) {
      if (
        !ids.has(folder.id) &&
        folder.parentFolderId !== null &&
        ids.has(folder.parentFolderId)
      ) {
        ids.add(folder.id);
        grew = true;
      }
    }
  }

  return ids;
};

/** Tracks linked in the scope, the originals of adjusted ones, and the adjusted tracks of all of them. */
const selectSources = (
  sources: readonly DriveAudioSource[],
  linkedTrackIds: ReadonlySet<string>,
): Set<string> => {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const ids = new Set<string>();

  for (const id of linkedTrackIds) {
    const source = byId.get(id);

    if (source) {
      ids.add(source.adjustment?.sourceRef ?? id);
      ids.add(id);
    }
  }

  for (const source of sources) {
    if (source.adjustment && ids.has(source.adjustment.sourceRef)) {
      ids.add(source.id);
    }
  }

  return new Set([...ids].filter((id) => byId.has(id)));
};

export const selectLibraryBundleContents = (
  input: LibraryBundleInput,
  scope: LibraryBundleSelectionScope,
): LibraryBundleSelection => {
  const { tree } = input;
  const rootFolderId =
    scope.kind === 'library' ? tree.rootFolderId : scope.folderId;
  const subtree = collectSubtree(tree, rootFolderId);
  const scopedLinks = tree.fileLinks.filter((link) =>
    subtree.has(link.parentFolderId),
  );
  const linkedIds = (kind: RehearsalLibraryEntityKind) =>
    new Set(
      scopedLinks
        .filter((link) => link.entityKind === kind)
        .map((link) => link.entityId),
    );

  let leftOut = 0;
  const sourceIds =
    scope.kind === 'library'
      ? new Set(input.sources.map((source) => source.id))
      : selectSources(input.sources, linkedIds('track'));
  const sources = input.sources.filter((source) => sourceIds.has(source.id));

  const loops = input.loops.filter((loop) => sourceIds.has(loop.sourceId));
  const linkedLoopIds = linkedIds('loop');
  leftOut += input.loops.filter(
    (loop) => linkedLoopIds.has(loop.id) && !sourceIds.has(loop.sourceId),
  ).length;
  const loopIds = new Set(loops.map((loop) => loop.id));

  const linkedCompositeIds = linkedIds('composite');
  const composites: CompositeTrack[] = [];

  for (const composite of input.composites) {
    const linked = linkedCompositeIds.has(composite.id);
    const stems = composite.stems.filter((stem) => sourceIds.has(stem.trackId));

    if (scope.kind === 'folder' && !linked && stems.length === 0) {
      continue;
    }

    if (stems.length < MIN_COMPOSITE_STEMS) {
      // Only a composite the folder holds counts as something left out.
      leftOut += linked ? 1 : 0;
      continue;
    }

    leftOut += composite.stems.length - stems.length;
    composites.push({ ...composite, stems });
  }

  const compositeIds = new Set(composites.map((composite) => composite.id));
  const linkedPlaylistIds = linkedIds('playlist');
  const playlists = input.playlists.filter((playlist) => {
    return (
      scope.kind === 'library' ||
      linkedPlaylistIds.has(playlist.id) ||
      playlist.items.some((entry) =>
        isEntryInScope(entry, sourceIds, loopIds, compositeIds),
      )
    );
  });

  const selectedIds: Record<RehearsalLibraryEntityKind, Set<string>> = {
    track: sourceIds,
    loop: loopIds,
    composite: compositeIds,
    playlist: new Set(playlists.map((playlist) => playlist.id)),
  };
  const fileLinks = scopedLinks.filter((link) => {
    const kept = selectedIds[link.entityKind].has(link.entityId);

    // A link to a loop or composite that was dropped is counted above.
    return kept;
  });
  const linkedAfter = new Set(
    fileLinks.map((link) => `${link.entityKind}:${link.entityId}`),
  );
  const unlinked = (
    Object.keys(selectedIds) as RehearsalLibraryEntityKind[]
  ).flatMap((kind) =>
    [...selectedIds[kind]]
      .filter((id) => !linkedAfter.has(`${kind}:${id}`))
      .map((id) => ({ kind, id })),
  );

  return {
    rootFolderId,
    folders: tree.folders.filter(
      (folder) => subtree.has(folder.id) && folder.id !== rootFolderId,
    ),
    sources,
    loops,
    playlists,
    composites,
    fileLinks,
    // Library scope mirrors the library: it never invents links for strays.
    unlinked: scope.kind === 'library' ? [] : unlinked,
    leftOutReferenceCount:
      leftOut +
      countLeftOutPlaylistEntries(playlists, sourceIds, loopIds, compositeIds),
  };
};

export const isEntryInScope = (
  entry: Playlist['items'][number],
  sourceIds: ReadonlySet<string>,
  loopIds: ReadonlySet<string>,
  compositeIds: ReadonlySet<string>,
): boolean => {
  if (entry.recordingId !== undefined) {
    return false;
  }

  if (entry.kind === 'composite') {
    return compositeIds.has(entry.sourceId);
  }

  if (entry.kind === 'loop') {
    return entry.loopId !== undefined && loopIds.has(entry.loopId);
  }

  return sourceIds.has(entry.sourceId);
};

const countLeftOutPlaylistEntries = (
  playlists: readonly Playlist[],
  sourceIds: ReadonlySet<string>,
  loopIds: ReadonlySet<string>,
  compositeIds: ReadonlySet<string>,
): number => {
  return playlists.reduce(
    (total, playlist) =>
      total +
      playlist.items.filter(
        (entry) => !isEntryInScope(entry, sourceIds, loopIds, compositeIds),
      ).length,
    0,
  );
};
