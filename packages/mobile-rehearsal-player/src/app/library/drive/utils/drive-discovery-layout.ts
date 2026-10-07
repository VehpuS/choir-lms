export const ADD_SCREEN_DRIVE_PANEL_ORDER = ['discovery'] as const;

// The search field sits directly under the root switcher so the scope it
// searches is implied by position (design Decision 14).
export const DRIVE_DISCOVERY_NAVIGATION_ORDER = [
  'root-selector',
  'search-control',
  'breadcrumbs',
] as const;

export type DriveStatusTone = 'neutral' | 'ready' | 'warning' | 'error';

/**
 * No card is ever inserted above a list that is loading or already has rows
 * (Decisions 13 and 14): loading shows placeholder rows, and a search that has
 * results reports through its summary line instead. A card remains only for a
 * location with nothing to list (empty, warning, error, authorization).
 */
export const shouldShowDriveStatusCard = (
  isLoading: boolean,
  statusTone: DriveStatusTone,
  isSearchMode: boolean,
  hasRows = false,
) => {
  if (isLoading || (isSearchMode && hasRows)) {
    return false;
  }

  return statusTone !== 'ready';
};

/** Placeholder rows show only while loading with nothing to list yet. */
export const shouldShowDriveLoadingRows = (options: {
  isLoading: boolean;
  rowCount: number;
}) => options.isLoading && options.rowCount === 0;

export const shouldShowUnavailableSources = (sourceCount: number) =>
  sourceCount > 0;
