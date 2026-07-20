import { useEffect } from 'react';

import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import type { SavedRehearsalLibrarySectionProps } from './types';

type UseSavedRehearsalLibrarySectionEffectsOptions = {
  detailMode: 'browse' | 'playlist-detail' | 'track-loop-detail';
  isSearchPanelVisible: boolean;
  onFilesExplorerVisibilityChange?: (isVisible: boolean) => void;
  savedLibrarySources: SavedRehearsalLibrarySectionProps['savedLibrarySources'];
  savedLoops: SavedRehearsalLibrarySectionProps['savedLoops'];
  savedPlaylists: SavedRehearsalLibrarySectionProps['savedPlaylists'];
  selectedView: SavedRehearsalLibraryView;
  syncActivePlaylistContext: SavedRehearsalLibrarySectionProps['syncActivePlaylistContext'];
};

export const useSavedRehearsalLibrarySectionEffects = ({
  detailMode,
  isSearchPanelVisible,
  onFilesExplorerVisibilityChange,
  savedLibrarySources,
  savedLoops,
  savedPlaylists,
  selectedView,
  syncActivePlaylistContext,
}: UseSavedRehearsalLibrarySectionEffectsOptions) => {
  useEffect(() => {
    syncActivePlaylistContext({
      loops: savedLoops,
      playlists: savedPlaylists,
      sources: savedLibrarySources,
    });
  }, [
    savedLibrarySources,
    savedLoops,
    savedPlaylists,
    syncActivePlaylistContext,
  ]);

  useEffect(() => {
    onFilesExplorerVisibilityChange?.(
      selectedView === 'files' &&
        detailMode === 'browse' &&
        !isSearchPanelVisible,
    );
  }, [
    detailMode,
    isSearchPanelVisible,
    onFilesExplorerVisibilityChange,
    selectedView,
  ]);
};
