export const ADD_SCREEN_DRIVE_PANEL_ORDER = ['discovery'] as const;

export const DRIVE_DISCOVERY_NAVIGATION_ORDER = [
  'root-selector',
  'breadcrumbs',
  'search-control',
] as const;

export type DriveStatusTone = 'neutral' | 'ready' | 'warning' | 'error';

/**
 * Browsing never shows the card while a location loads: the list region shows
 * placeholder rows instead, so nothing is inserted above the list (Decision 13).
 * Search keeps its progressive status card.
 */
export const shouldShowDriveStatusCard = (
  isLoading: boolean,
  statusTone: DriveStatusTone,
  isSearchMode: boolean,
) => {
  if (isLoading) {
    return isSearchMode;
  }

  return statusTone !== 'ready';
};

/** Browse shows placeholder rows only while loading with nothing to show yet. */
export const shouldShowDriveLoadingRows = (options: {
  isLoading: boolean;
  isSearchMode: boolean;
  rowCount: number;
}) => options.isLoading && !options.isSearchMode && options.rowCount === 0;

export const shouldShowUnavailableSources = (sourceCount: number) =>
  sourceCount > 0;
