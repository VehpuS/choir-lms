import type { RehearsalLibraryFileLinkNode } from '@org/audio-library-models';

import type { LibraryFilesRow } from './library-files-model';

/** What the user chose for a track that has several copies in Files. */
export type TrackRenameCopiesChoice = 'all' | 'this';

/**
 * How a Files rename of a row plays out:
 * - `copy-only`: only this link's visible name changes (every other row kind,
 *   or a copy the user chose to rename alone);
 * - `track-and-copies`: the track entry and every copy are renamed;
 * - `ask`: the track has several copies and no remembered choice.
 */
export type FilesRenamePlan = 'ask' | 'copy-only' | 'track-and-copies';

export const countTrackCopies = (
  fileLinks: readonly RehearsalLibraryFileLinkNode[],
  sourceId: string,
) => {
  return fileLinks.filter((fileLink) => {
    return fileLink.entityKind === 'track' && fileLink.entityId === sourceId;
  }).length;
};

export const planFilesRename = (options: {
  fileLinks: readonly RehearsalLibraryFileLinkNode[];
  remembered: TrackRenameCopiesChoice | null;
  row: LibraryFilesRow;
}): FilesRenamePlan => {
  const { fileLinks, remembered, row } = options;

  if (row.kind !== 'track') {
    return 'copy-only';
  }

  // The only copy: the track entry and its copy are the same thing to the user.
  if (countTrackCopies(fileLinks, row.source.id) <= 1) {
    return 'track-and-copies';
  }

  if (remembered === null) {
    return 'ask';
  }

  return remembered === 'all' ? 'track-and-copies' : 'copy-only';
};
