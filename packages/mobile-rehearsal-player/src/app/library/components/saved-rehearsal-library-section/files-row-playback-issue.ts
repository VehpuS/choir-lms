import { createTrackPlayableItem } from '@org/audio-library-models';

import { getSavedTrackPlaybackItemIssue } from '../../playback/utils/saved-track-playback-presentation';
import type { SavedTrackPlaybackIssue } from '../../playback/utils/saved-track-playback-presentation';
import type { LibraryFilesExplorerState } from '../../saved-rehearsal-library/library-files-model';

type FilesRow = LibraryFilesExplorerState['rows'][number];

/** The playback issue that belongs to this row's own file, if any. */
export const getFilesRowPlaybackIssue = (
  issue: SavedTrackPlaybackIssue | null,
  row: FilesRow,
) => {
  if (!issue) {
    return undefined;
  }

  if (row.kind === 'track') {
    return getSavedTrackPlaybackItemIssue(
      issue,
      createTrackPlayableItem(row.source),
    );
  }

  if (row.kind === 'loop' && row.playableItem) {
    return getSavedTrackPlaybackItemIssue(issue, row.playableItem);
  }

  return undefined;
};

/**
 * Whether the Files rows on screen already show this issue on a row, so the
 * status card above them can give way (it stays for issues tied to no row).
 */
export const isPlaybackIssueShownOnFilesRow = (
  issue: SavedTrackPlaybackIssue | null,
  rows: readonly FilesRow[] | undefined,
) => {
  return (
    issue !== null &&
    (rows ?? []).some(
      (row) => getFilesRowPlaybackIssue(issue, row) !== undefined,
    )
  );
};
