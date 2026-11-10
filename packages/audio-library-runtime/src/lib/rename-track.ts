import type {
  DriveAudioSource,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';

/**
 * Which Files copies of the track follow its new name:
 * - `all`: every copy, whatever it was called (the user chose to rename them).
 * - `matching`: only copies still named like the track, so a copy the user
 *   named on purpose keeps its own name.
 */
export type TrackRenameCopies = 'all' | 'matching';

type TrackRenameRepository = {
  listLibraryFileTree(ownerId: string): Promise<RehearsalLibraryFileTree>;
  listSources(ownerId: string): Promise<DriveAudioSource[]>;
  saveLibraryNodes(
    ownerId: string,
    nodes: { fileLinks?: RehearsalLibraryFileLinkNode[] },
  ): Promise<RehearsalLibraryFileTree>;
  saveSource(
    ownerId: string,
    source: DriveAudioSource,
  ): Promise<DriveAudioSource[]>;
};

export type TrackRenameResult = {
  sources: DriveAudioSource[];
  tree: RehearsalLibraryFileTree;
};

/** The copies of a track: the Files links that point at it. */
export const listTrackCopies = (
  tree: RehearsalLibraryFileTree,
  sourceId: string,
) => {
  return tree.fileLinks.filter((fileLink) => {
    return fileLink.entityKind === 'track' && fileLink.entityId === sourceId;
  });
};

/**
 * Renames a track entry and brings its Files copies along, as one change: the
 * copies are checked for name clashes against the new name, and the track is
 * put back if any of them clashes.
 */
export const renameTrackInRepository = async (
  repository: TrackRenameRepository,
  ownerId: string,
  options: { copies: TrackRenameCopies; name: string; sourceId: string },
): Promise<TrackRenameResult> => {
  const name = options.name.trim();

  if (!name) {
    throw new Error('Enter a track name.');
  }

  const sources = await repository.listSources(ownerId);
  const source = sources.find(({ id }) => id === options.sourceId);

  if (!source) {
    throw new Error('The track to rename is no longer in the library.');
  }

  const tree = await repository.listLibraryFileTree(ownerId);
  const previousName = source.name;
  const copiesToRename = listTrackCopies(tree, source.id).filter((copy) => {
    return (
      options.copies === 'all' ||
      copy.visibleName === undefined ||
      copy.visibleName === previousName
    );
  });

  await repository.saveSource(ownerId, { ...source, name });

  try {
    // Named explicitly, so the library checks each copy against its folder.
    const nextTree = await repository.saveLibraryNodes(ownerId, {
      fileLinks: copiesToRename.map((copy) => ({ ...copy, visibleName: name })),
    });

    return { sources: await repository.listSources(ownerId), tree: nextTree };
  } catch (error) {
    await repository.saveSource(ownerId, source);
    throw error;
  }
};
