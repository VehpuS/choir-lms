import {
  createCompositeFileLink,
  resolveCompositeFolderId,
} from '@org/audio-library-runtime';
import type {
  CompositeTrack,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';

/** The two repository calls placing a composite needs. */
export type CompositePlacementRepository = {
  /** Reading the tree also gives the new composite its link, at the root. */
  listLibraryFileTree: (ownerId: string) => Promise<RehearsalLibraryFileTree>;
  saveLibraryFileLink: (
    ownerId: string,
    fileLink: RehearsalLibraryFileLinkNode,
  ) => Promise<unknown>;
};

/**
 * Files a new composite in the folder of its first stem's file (composite-
 * tracks 7.5, `Save in` default), else leaves it at the root. Reading the tree
 * first makes the tree sync create the composite's root link, which saving the
 * same link in a folder then moves.
 */
export const placeNewComposite = async (options: {
  composite: CompositeTrack;
  ownerId: string;
  repository: CompositePlacementRepository;
}): Promise<void> => {
  const { composite, ownerId, repository } = options;
  const tree = await repository.listLibraryFileTree(ownerId);
  const folderId = resolveCompositeFolderId(
    tree,
    composite.stems.map((stem) => stem.trackId),
  );

  if (folderId === tree.rootFolderId) {
    return;
  }

  await repository.saveLibraryFileLink(
    ownerId,
    createCompositeFileLink(composite, folderId),
  );
};
