export const ADD_SCREEN_DRIVE_PANEL_ORDER = ['discovery'] as const;

export const DRIVE_DISCOVERY_NAVIGATION_ORDER = [
  'root-selector',
  'breadcrumbs',
  'search-control',
] as const;

export type DriveStatusTone = 'neutral' | 'ready' | 'warning' | 'error';

export const shouldShowDriveStatusCard = (
  isLoading: boolean,
  statusTone: DriveStatusTone,
) => isLoading || statusTone !== 'ready';

export const shouldShowUnavailableSources = (sourceCount: number) =>
  sourceCount > 0;
