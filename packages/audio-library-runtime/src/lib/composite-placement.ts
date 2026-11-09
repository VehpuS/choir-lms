import type {
  CompositeTrack,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';

/**
 * Where a new composite is saved (composite-tracks 7.4, Decision 12 `Files`):
 * the folder of the first stem whose track has a file in the tree, else the
 * root. The stems themselves never move.
 */
export const resolveCompositeFolderId = (
  tree: RehearsalLibraryFileTree,
  stemTrackIds: readonly string[],
): string => {
  for (const trackId of stemTrackIds) {
    const link = tree.fileLinks.find((fileLink) => {
      return fileLink.entityKind === 'track' && fileLink.entityId === trackId;
    });

    if (link) {
      return link.parentFolderId;
    }
  }

  return tree.rootFolderId;
};

/** The file link that places a composite in a folder (same id the tree sync would give it). */
export const createCompositeFileLink = (
  composite: Pick<CompositeTrack, 'id'>,
  parentFolderId: string,
): RehearsalLibraryFileLinkNode => ({
  id: `file-link:composite:${composite.id}`,
  parentFolderId,
  entityKind: 'composite',
  entityId: composite.id,
});
