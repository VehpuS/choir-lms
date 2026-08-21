import { useEffect, useRef } from 'react';

import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import type {
  LibraryBrowseCreateDockMode,
  SavedRehearsalLibrarySectionProps,
} from './types';

type UseSavedRehearsalLibrarySectionEffectsOptions = {
  closeTagDetail: () => void;
  closeTagDetailRequestId?: SavedRehearsalLibrarySectionProps['closeTagDetailRequestId'];
  detailMode: 'browse' | 'playlist-detail' | 'tag-detail' | 'track-loop-detail';
  isSearchPanelVisible: boolean;
  onBrowseCreateDockChange?: (mode: LibraryBrowseCreateDockMode) => void;
  onPlaylistSelectionHandlerChange?: SavedRehearsalLibrarySectionProps['onPlaylistSelectionHandlerChange'];
  openTagDetail: (tag: string) => void;
  requestedTag?: SavedRehearsalLibrarySectionProps['requestedTag'];
  requestedTagRequestId?: SavedRehearsalLibrarySectionProps['requestedTagRequestId'];
  savedLibrarySources: SavedRehearsalLibrarySectionProps['savedLibrarySources'];
  savedLoops: SavedRehearsalLibrarySectionProps['savedLoops'];
  savedPlaylists: SavedRehearsalLibrarySectionProps['savedPlaylists'];
  selectedView: SavedRehearsalLibraryView;
  setSelectedPlaylistId: (playlistId: string) => void;
  syncActivePlaylistContext: SavedRehearsalLibrarySectionProps['syncActivePlaylistContext'];
};

export const useSavedRehearsalLibrarySectionEffects = ({
  closeTagDetail,
  closeTagDetailRequestId,
  detailMode,
  isSearchPanelVisible,
  onBrowseCreateDockChange,
  onPlaylistSelectionHandlerChange,
  openTagDetail,
  requestedTag,
  requestedTagRequestId,
  savedLibrarySources,
  savedLoops,
  savedPlaylists,
  selectedView,
  setSelectedPlaylistId,
  syncActivePlaylistContext,
}: UseSavedRehearsalLibrarySectionEffectsOptions) => {
  const handledTagRequestIdRef = useRef<number | undefined>(undefined);
  const handledCloseTagDetailRequestIdRef = useRef<number | undefined>(
    closeTagDetailRequestId,
  );

  useEffect(() => {
    if (
      !requestedTag ||
      requestedTagRequestId === undefined ||
      handledTagRequestIdRef.current === requestedTagRequestId
    ) {
      return;
    }

    handledTagRequestIdRef.current = requestedTagRequestId;
    openTagDetail(requestedTag);
  }, [openTagDetail, requestedTag, requestedTagRequestId]);

  useEffect(() => {
    if (
      closeTagDetailRequestId === undefined ||
      handledCloseTagDetailRequestIdRef.current === closeTagDetailRequestId
    ) {
      return;
    }

    handledCloseTagDetailRequestIdRef.current = closeTagDetailRequestId;
    closeTagDetail();
  }, [closeTagDetail, closeTagDetailRequestId]);

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
