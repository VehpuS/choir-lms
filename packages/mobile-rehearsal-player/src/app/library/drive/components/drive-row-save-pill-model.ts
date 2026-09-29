import type { DriveLibrarySourceAction } from '../utils/drive-library-source-actions';

/**
 * One fixed width for every Save pill state (`Save`, `Saving…`, `✓ Saved`,
 * `Removing…`), so saving or removing never shifts the row's title or the
 * preview ring beside it. Sized for the widest state, `Removing…`.
 */
export const DRIVE_ROW_SAVE_PILL_WIDTH = 88;

export type DriveRowSavePillAppearance = {
  showsCheck: boolean;
  tone: 'accent' | 'neutral';
};

// Unsaved rows invite the save with the accent outline; a saved row is a
// quieter neutral `✓ Saved` toggle whose press starts removal.
export const getDriveRowSavePillAppearance = (
  action: Pick<DriveLibrarySourceAction, 'kind' | 'label'>,
): DriveRowSavePillAppearance => {
  if (action.kind !== 'saved-toggle') {
    return { showsCheck: false, tone: 'accent' };
  }

  return { showsCheck: action.label === 'Saved', tone: 'neutral' };
};
