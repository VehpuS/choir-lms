import { useEffect } from 'react';

import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import type {
  LibraryBrowseCreateDockMode,
  SavedRehearsalLibrarySectionProps,
} from './types';

type UseSavedRehearsalLibrarySectionEffectsOptions = {
  detailMode: 'browse' | 'playlist-detail' | 'track-loop-detail';
  isSearchPanelVisible: boolean;
  onBrowseCreateDockChange?: (mode: LibraryBrowseCreateDockMode) => void;
  onPlaylistSelectionHandlerChange?: SavedRehearsalLibrarySectionProps['onPlaylistSelectionHandlerChange'];
  savedLibrarySources: SavedRehearsalLibrarySectionProps['savedLibrarySources'];
  savedLoops: SavedRehearsalLibrarySectionProps['savedLoops'];
  savedPlaylists: SavedRehearsalLibrarySectionProps['savedPlaylists'];
  selectedView: SavedRehearsalLibraryView;
  setSelectedPlaylistId: (playlistId: string) => void;
  syncActivePlaylistContext: SavedRehearsalLibrarySectionProps['syncActivePlaylistContext'];
};

export const useSavedRehearsalLibrarySectionEffects = ({
  detailMode,
  isSearchPanelVisible,
  onBrowseCreateDockChange,
  onPlaylistSelectionHandlerChange,
  savedLibrarySources,
  savedLoops,
  savedPlaylists,
  selectedView,
  setSelectedPlaylistId,
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
    onPlaylistSelectionHandlerChange?.(setSelectedPlaylistId);

    return () => {
      onPlaylistSelectionHandlerChange?.(null);
    };
  }, [onPlaylistSelectionHandlerChange, setSelectedPlaylistId]);

  useEffect(() => {
    let nextDockMode: LibraryBrowseCreateDockMode = null;

    if (detailMode === 'browse' && !isSearchPanelVisible) {
      if (selectedView === 'files') {
        nextDockMode = 'files';
      }

      if (selectedView === 'playlists') {
        nextDockMode = 'playlists';
      }
    }

    onBrowseCreateDockChange?.(nextDockMode);
  }, [
    detailMode,
    isSearchPanelVisible,
    onBrowseCreateDockChange,
    selectedView,
  ]);
};
