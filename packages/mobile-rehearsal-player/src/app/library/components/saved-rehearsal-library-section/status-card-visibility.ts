import type { DriveLibraryStatusCopy } from '../../drive/utils/drive-library-view-model';

type StatusTone = DriveLibraryStatusCopy['tone'];

const isActionableStatusTone = (tone: StatusTone) => {
  return tone === 'error' || tone === 'warning';
};

export const shouldShowSavedLibraryStatusCard = (options: {
  isLoading: boolean;
  isSearchPanelVisible: boolean;
  savedSourceCount: number;
  statusTone: StatusTone;
}) => {
  if (options.isSearchPanelVisible) {
    return false;
  }

  if (isActionableStatusTone(options.statusTone)) {
    return true;
  }

  return options.savedSourceCount === 0 && !options.isLoading;
};

export const shouldShowPlaybackStatusCard = (options: {
  isSearchPanelVisible: boolean;
  statusTone: StatusTone | null;
}) => {
  return (
    !options.isSearchPanelVisible &&
    options.statusTone !== null &&
    isActionableStatusTone(options.statusTone)
  );
};
