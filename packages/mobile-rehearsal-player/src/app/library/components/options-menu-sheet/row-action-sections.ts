import type { OptionsMenuAction } from './model';

export type RowActionSection = 'destructive' | 'organize' | 'rehearsal';

/**
 * Shared rehearsal/organize/destructive grouping for the saved-item row
 * vocabulary that recurs across Files, the dedicated Tracks view, and the
 * dedicated Loops view (all three ultimately surface the same
 * `resolveSavedTrackRowActions`/`resolveSavedLoopRowActions` labels, plus
 * the Files-only file-link actions). Keeping this map in one place lets
 * every surface render the same section dividers for the same labels.
 */
const ROW_ACTION_SECTION_BY_LABEL = new Map<string, RowActionSection>([
  ['Play next', 'rehearsal'],
  ['Add to queue', 'rehearsal'],
  ['Add to playlist', 'rehearsal'],
  ['Playlists unavailable', 'rehearsal'],
  ['Updating playlist…', 'rehearsal'],
  ['Add items', 'rehearsal'],
  ['Make loop', 'rehearsal'],
  ['Preparing loop…', 'rehearsal'],
  ['Edit loop', 'rehearsal'],
  ['Editing…', 'rehearsal'],
  ['View track loops', 'rehearsal'],
  ['Reconnect', 'organize'],
  ['Create a copy', 'organize'],
  ['Edit tags', 'organize'],
  ['Rename', 'organize'],
  ['Move to folder', 'organize'],
  ['Delete from folder', 'destructive'],
  ['Remove from library', 'destructive'],
  ['Remove', 'destructive'],
  ['Removing…', 'destructive'],
]);

export const getRowActionSection = (
  label: string,
): RowActionSection | undefined => {
  return ROW_ACTION_SECTION_BY_LABEL.get(label);
};

export const attachRowActionSections = (
  actions: OptionsMenuAction[],
): OptionsMenuAction[] => {
  return actions.map((action) => {
    return {
      ...action,
      section: getRowActionSection(action.label),
    };
  });
};
