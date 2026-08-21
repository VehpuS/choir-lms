import { useEffect, useRef } from 'react';

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
  openPlaylistDetail: (playlistId: string) => void;
  requestedPlaylistId?: SavedRehearsalLibrarySectionProps['requestedPlaylistId'];
  requestedPlaylistIdRequestId?: SavedRehearsalLibrarySectionProps['requestedPlaylistIdRequestId'];
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
  openPlaylistDetail,
  requestedPlaylistId,
  requestedPlaylistIdRequestId,
  savedLibrarySources,
  savedLoops,
  savedPlaylists,
  selectedView,
  setSelectedPlaylistId,
  syncActivePlaylistContext,
}: UseSavedRehearsalLibrarySectionEffectsOptions) => {
  const handledPlaylistRequestIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (
      !requestedPlaylistId ||
      requestedPlaylistIdRequestId === undefined ||
      handledPlaylistRequestIdRef.current === requestedPlaylistIdRequestId
    ) {
      return;
    }

    handledPlaylistRequestIdRef.current = requestedPlaylistIdRequestId;
    openPlaylistDetail(requestedPlaylistId);
  }, [
    openPlaylistDetail,
    requestedPlaylistId,
    requestedPlaylistIdRequestId,
  ]);

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
