import type { PlayableItem } from '@org/audio-library-models';

import type {
  SavedRehearsalLibraryDetailMode,
  SavedRehearsalLibraryView,
} from '../../saved-rehearsal-library/detail-mode';

export const shouldRenderSavedLibraryBrowseContent = (options: {
  detailMode: SavedRehearsalLibraryDetailMode;
  isSearchPanelVisible: boolean;
  isSearchResultsVisible: boolean;
  selectedView: SavedRehearsalLibraryView;
}) => {
  if (options.detailMode !== 'browse') {
    return false;
  }

  if (!options.isSearchPanelVisible) {
    return true;
  }

  return options.isSearchResultsVisible || options.selectedView === 'files';
};

export const shouldRenderFilesExplorer = (
  selectedView: SavedRehearsalLibraryView,
) => {
  return selectedView === 'files';
};

export const shouldRenderFilesLoopBuilder = (options: {
  activeLibrarySearchQuery: string | null;
  selectedTrack: PlayableItem | null;
  selectedView: SavedRehearsalLibraryView;
}) => {
  return (
    options.selectedView === 'files' &&
    !options.activeLibrarySearchQuery &&
    options.selectedTrack !== null
  );
};
