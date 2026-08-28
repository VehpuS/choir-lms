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

export const shouldRenderSavedTagsList = (
  selectedView: SavedRehearsalLibraryView,
) => {
  return selectedView === 'tags';
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

// The Files explorer tree caches its own copy of each entity's fields (see
// `use-library-files.ts`), which does not refresh on a tags-only save. Row
// actions that open the tag editor must resolve the entity fresh from the
// reactive saved-library list by id rather than trust the tree's cached
// object, or the editor reopens showing stale tags.
export const resolveFreshEntityForTagEditor = <Entity extends { id: string }>(
  entities: Entity[],
  entityId: string,
): Entity | null => {
  return entities.find((entity) => entity.id === entityId) ?? null;
};
