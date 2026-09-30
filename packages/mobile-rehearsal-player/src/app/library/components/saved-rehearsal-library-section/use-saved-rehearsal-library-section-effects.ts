import type { NamedLoop } from '@org/audio-library-models';
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
  openLoopEditor: (loop: NamedLoop) => void;
  openTagDetail: (tag: string) => void;
  requestedLoopEditId?: string | null;
  requestedLoopEditRequestId?: number;
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
  openLoopEditor,
  openTagDetail,
  requestedLoopEditId,
  requestedLoopEditRequestId,
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
  const handledLoopEditRequestIdRef = useRef<number | undefined>(undefined);
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

  // Opens the loop editor for a loop another surface asked to edit (the
  // playback sheet's loop chip). Waits for the loops to load, then handles
  // each request once.
  useEffect(() => {
    if (
      !requestedLoopEditId ||
      requestedLoopEditRequestId === undefined ||
      handledLoopEditRequestIdRef.current === requestedLoopEditRequestId
    ) {
      return;
    }

    const loop = savedLoops.find((savedLoop) => {
      return savedLoop.id === requestedLoopEditId;
    });

    if (!loop) {
      return;
    }

    handledLoopEditRequestIdRef.current = requestedLoopEditRequestId;
    openLoopEditor(loop);
  }, [
    openLoopEditor,
    requestedLoopEditId,
    requestedLoopEditRequestId,
    savedLoops,
  ]);

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
