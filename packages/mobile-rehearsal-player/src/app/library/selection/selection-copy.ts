// The words every selection surface (Add, Library views, playlist detail, tag
// detail, search) shows, kept in one place so they cannot drift apart.

export const SELECTION_COPY = {
  cancel: 'Cancel',
  clear: 'Clear',
  continue: 'Continue',
  deselectAll: 'Deselect all',
  enter: 'Select',
  moreActions: 'More actions',
  selectAll: 'Select all',
} as const;

export const getSelectionCountLabel = (selectedCount: number): string =>
  `${selectedCount} selected`;

/** One control: `Select all`, or `Deselect all` once everything is selected. */
export const getSelectAllToggleLabel = (isAllSelected: boolean): string =>
  isAllSelected ? SELECTION_COPY.deselectAll : SELECTION_COPY.selectAll;
