import type { LibraryFilesConfirmationDialogContent } from '../../library/selection/library-files-confirmation-dialog';
import type { OfflineFileRow } from '../../library/offline/offline-storage-model';
import { getClearAllConfirmation } from './model';

/**
 * What `Clear offline files…` from a no-room message asks (composite-tracks
 * 9.2): the offline files view's own `Clear all` confirmation, or, when there
 * is nothing to clear, a plain note that says so, so the button never seems to
 * do nothing.
 */

export const NOTHING_TO_CLEAR_CONTENT: LibraryFilesConfirmationDialogContent = {
  confirmLabel: 'OK',
  message:
    'There are no offline files or prepared composites to clear. You can export and delete recordings in "Settings", or remove stems or choose shorter tracks.',
  title: 'Nothing to clear',
};

export type ClearOfflineFilesPlan = {
  content: LibraryFilesConfirmationDialogContent;
  /** False when confirming only dismisses the note. */
  clears: boolean;
};

export const resolveClearOfflineFilesPlan = (
  rows: readonly OfflineFileRow[],
  prepared: { count: number; totalBytes: number },
): ClearOfflineFilesPlan => {
  if (rows.length === 0 && prepared.count === 0) {
    return { content: NOTHING_TO_CLEAR_CONTENT, clears: false };
  }

  return { content: getClearAllConfirmation(rows, prepared), clears: true };
};
