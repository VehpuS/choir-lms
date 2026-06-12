import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createTrackPlayableItem,
  renamePlaylist,
  type NamedLoop,
  type PlayableItem,
  type Playlist,
} from '@org/audio-library-models';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import type { SavedRehearsalLibraryIssue } from '../hooks/use-saved-rehearsal-library';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../hooks/use-saved-rehearsal-library';
import {
  type DriveLibrarySource,
  type DriveLibraryStatusCopy,
} from '../drive/utils/drive-library-view-model';
import {
  filterSavedLibrarySourcesByQuery,
  filterSavedLoopsByQuery,
  filterSavedPlaylistsByQuery,
  resolveActiveLibrarySearchQuery,
} from '../utils/saved-library-search-view-model';
import type { SavedLoopIssue } from '../utils/saved-loop-view-model';
import type { PlaylistPlaybackSession } from '../utils/saved-playlist-playback-view-model';
import { getPlaylistPlaybackActionCopy } from '../utils/saved-playlist-playback-view-model';
import { getSelectedPlaylistIssue } from '../utils/saved-playlist-status-view-model';
import {
  buildSavedPlaylist,
  getSavedPlaylistRemovalCopy,
  resolveSavedPlaylistCards,
  resolveSelectedPlaylist,
  validatePlaylistName,
  type PlaylistDraftIssue,
  type SavedPlaylistIssue,
} from '../utils/saved-playlist-view-model';
import { resolveSavedRehearsalLibraryDetailMode } from '../utils/saved-rehearsal-library-detail-view-model';
import {
  getSavedRehearsalLibraryDependentLoops,
  getSavedRehearsalLibrarySourceIssue,
} from '../utils/saved-rehearsal-library-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  isSavedTrackPlaybackActive,
  isSavedTrackPlaybackBusy,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../utils/saved-track-playback-view-model';
import {
  getSavedTrackPlaylistMenuInitialState,
  reduceSavedTrackPlaylistMenuState,
} from '../utils/saved-track-playlist-menu-view-model';
import { resolveSavedTrackRowActions } from '../utils/saved-track-row-actions';
import {
  normalizeRecentSearchTerm,
  recordRecentSearchTerm,
} from '../utils/search-history';
import {
  LIBRARY_RECENT_SEARCH_HISTORY_KEY,
  persistRecentSearchHistory,
  restoreRecentSearchHistory,
} from '../utils/search-history-storage';
import {
  buildTrackScopedLoopPlaybackPlaylist,
  getTrackScopedLoopDetailCopy,
} from '../utils/track-scoped-loop-view-model';
import { DriveLibrarySectionHeader } from '../drive/components/drive-library-section-header';
import { DriveLibrarySourceGroup } from '../drive/components/drive-library-source-group';
import { DriveLibraryStatusCard } from '../drive/components/drive-library-status-card';
import { LibrarySearchPanel } from './LibrarySearchPanel';
import { SavedLoopSection } from './SavedLoopSection';
import { SavedPlaylistSection } from './SavedPlaylistSection';
import { SavedPlaylistCardsList } from './SavedPlaylistSectionCards';
import { SavedTrackPlaylistMenuSurface } from './SavedTrackPlaylistMenuSurface';

type SavedRehearsalLibrarySectionProps = {
  activePlayableItem: PlayableItem | null;
  activePlaylistSession: PlaylistPlaybackSession | null;
  canMutateLibrary: boolean;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  deletePlaylist: (playlist: Playlist) => Promise<boolean>;
  isPlaybackPreparing: boolean;
  isPlaylistsLoading: boolean;
  isSavedLibraryLoading: boolean;
  isSavedLoopsLoading: boolean;
  pendingPlaylistId: string | null;
  pendingSourceId: string | null;
  pendingLoopId: string | null;
  playlistIssue: SavedPlaylistIssue | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  removeLoop: (loop: NamedLoop) => void;
  removeSource: (source: DriveLibrarySource) => void;
  savedLibraryIssue: SavedRehearsalLibraryIssue | null;
  savedLibrarySources: DriveLibrarySource[];
  savedLoopIssue: SavedLoopIssue | null;
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedLibraryStatusCopy: DriveLibraryStatusCopy;
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  getCurrentScrollOffsetY: () => number;
  savedTrackPlaybackStatusCopy: DriveLibraryStatusCopy | null;
  setIsPlaylistReorderDragActive: (isActive: boolean) => void;
  setPlaylistReorderDragMoveY: (moveY: number) => void;
  syncActivePlaylistContext: (options: {
    loops: NamedLoop[];
    playlists: Playlist[];
    sources: DriveLibrarySource[];
  }) => void;
  openLoopBuilderForSource: (source: DriveLibrarySource) => void;
  pendingLoopBuilderSourceId: string | null;
  selectedTrack: PlayableItem | null;
  setSelectedLoopSourceId: (sourceId: string | null) => void;
  toggleActivePlayback: () => Promise<void>;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  queuePlayableItemNext: (playableItem: PlayableItem) => void;
  queuePlayableItemUpNext: (playableItem: PlayableItem) => void;
  togglePlaylistPlayback: (options: {
    loops: NamedLoop[];
    mode: 'ordered' | 'shuffle';
    playlist: Playlist;
    sources: DriveLibrarySource[];
    startEntryId?: string;
  }) => Promise<void>;
  toggleSourcePlayback: (source: DriveLibrarySource) => Promise<void>;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
};

const BORDER_COLOR = '#d6d1c4';

export const SavedRehearsalLibrarySection = ({
  activePlayableItem,
  activePlaylistSession,
  canMutateLibrary,
  canMutateLoops,
  canMutatePlaylists,
  createPlaylist,
  deletePlaylist,
  isPlaybackPreparing,
  isPlaylistsLoading,
  isSavedLibraryLoading,
  isSavedLoopsLoading,
  pendingPlaylistId,
  pendingSourceId,
  pendingLoopId,
  playlistIssue,
  playbackIssue,
  playbackState,
  removeLoop,
  removeSource,
  savedLibraryIssue,
  savedLibrarySources,
  savedLoopIssue,
  savedLoops,
  savedPlaylists,
  savedLibraryStatusCopy,
  saveLoop,
  getCurrentScrollOffsetY,
  savedTrackPlaybackStatusCopy,
  setIsPlaylistReorderDragActive,
  setPlaylistReorderDragMoveY,
  syncActivePlaylistContext,
  openLoopBuilderForSource,
  pendingLoopBuilderSourceId,
  selectedTrack,
  setSelectedLoopSourceId,
  toggleActivePlayback,
  togglePlayableItemPlayback,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  togglePlaylistPlayback,
  toggleSourcePlayback,
  updatePlaylist,
}: SavedRehearsalLibrarySectionProps) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null,
  );
  const [isPlaylistDetailVisible, setIsPlaylistDetailVisible] = useState(false);
  const [selectedLoopEditId, setSelectedLoopEditId] = useState<string | null>(
    null,
  );
  const [selectedLoopViewSourceId, setSelectedLoopViewSourceId] = useState<
    string | null
  >(null);
  const [cardRenameIssue, setCardRenameIssue] =
    useState<PlaylistDraftIssue | null>(null);
  const [cardRenamePlaylistId, setCardRenamePlaylistId] = useState<
    string | null
  >(null);
  const [cardRenamePlaylistName, setCardRenamePlaylistName] = useState('');
  const [trackPlaylistCreationIssue, setTrackPlaylistCreationIssue] =
    useState<PlaylistDraftIssue | null>(null);
  const [trackPlaylistMenuState, dispatchTrackPlaylistMenu] = useReducer(
    reduceSavedTrackPlaylistMenuState,
    undefined,
    getSavedTrackPlaylistMenuInitialState,
  );
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [recentLibrarySearchTerms, setRecentLibrarySearchTerms] = useState<
    string[]
  >([]);
  const [
    hasLoadedRecentLibrarySearchTerms,
    setHasLoadedRecentLibrarySearchTerms,
  ] = useState(false);
  const [activeLibrarySearchQuery, setActiveLibrarySearchQuery] = useState<
    string | null
  >(null);

  useEffect(() => {
    let isUnrendered = false;

    void restoreRecentSearchHistory(LIBRARY_RECENT_SEARCH_HISTORY_KEY)
      .then((restoredRecentSearchTerms) => {
        if (isUnrendered) {
          return;
        }

        setRecentLibrarySearchTerms(restoredRecentSearchTerms);
      })
      .finally(() => {
        if (isUnrendered) {
          return;
        }

        setHasLoadedRecentLibrarySearchTerms(true);
      });

    return () => {
      isUnrendered = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedRecentLibrarySearchTerms) {
      return;
    }

    void persistRecentSearchHistory(
      LIBRARY_RECENT_SEARCH_HISTORY_KEY,
      recentLibrarySearchTerms,
    );
  }, [hasLoadedRecentLibrarySearchTerms, recentLibrarySearchTerms]);

  useEffect(() => {
    if (savedPlaylists.length === 0) {
      setSelectedPlaylistId(null);
      setIsPlaylistDetailVisible(false);
      return;
    }

    const hasSelectedPlaylist = savedPlaylists.some((playlist) => {
      return playlist.id === selectedPlaylistId;
    });

    if (!hasSelectedPlaylist) {
      setSelectedPlaylistId(savedPlaylists[0]?.id ?? null);
    }
  }, [savedPlaylists, selectedPlaylistId]);

  const selectedPlaylist = resolveSelectedPlaylist(
    savedPlaylists,
    selectedPlaylistId,
  );
  const selectedTrackMenuSource =
    savedLibrarySources.find((source) => {
      return source.id === trackPlaylistMenuState.selectedSourceId;
    }) ?? null;
  const selectedTrackMenuLoop =
    savedLoops.find((loop) => {
      return loop.id === trackPlaylistMenuState.selectedLoopId;
    }) ?? null;
  const selectedLoopEdit =
    savedLoops.find((loop) => {
      return loop.id === selectedLoopEditId;
    }) ?? null;

  useEffect(() => {
    if (!selectedPlaylist) {
      setIsPlaylistDetailVisible(false);
    }
  }, [selectedPlaylist]);

  useEffect(() => {
    if (selectedLoopEditId === null) {
      return;
    }

    const hasSelectedLoop = savedLoops.some((loop) => {
      return loop.id === selectedLoopEditId;
    });

    if (!hasSelectedLoop) {
      setSelectedLoopEditId(null);
    }
  }, [savedLoops, selectedLoopEditId]);

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
    if (trackPlaylistMenuState.selectedSourceId && !selectedTrackMenuSource) {
      dispatchTrackPlaylistMenu({ type: 'close' });
      setTrackPlaylistCreationIssue(null);
      return;
    }

    if (trackPlaylistMenuState.selectedLoopId && !selectedTrackMenuLoop) {
      dispatchTrackPlaylistMenu({ type: 'close' });
      setTrackPlaylistCreationIssue(null);
      return;
    }

    if (
      !trackPlaylistMenuState.selectedSourceId &&
      !trackPlaylistMenuState.selectedLoopId
    ) {
      return;
    }
  }, [
    selectedTrackMenuLoop,
    selectedTrackMenuSource,
    trackPlaylistMenuState.selectedLoopId,
    trackPlaylistMenuState.selectedSourceId,
  ]);

  const isSavedLibraryMutating = pendingSourceId !== null;
  const isSavedTrackPlaybackLoading = isSavedTrackPlaybackBusy({
    isPreparing: isPlaybackPreparing,
    playbackState,
  });
  const isPlaylistMutating = pendingPlaylistId !== null;
  const canQueueAsNext = activePlayableItem !== null;
  const visibleSavedLibrarySources = useMemo(() => {
    return filterSavedLibrarySourcesByQuery({
      activeSearchQuery: activeLibrarySearchQuery,
      sources: savedLibrarySources,
    });
  }, [activeLibrarySearchQuery, savedLibrarySources]);
  const visibleSavedLoops = useMemo(() => {
    return filterSavedLoopsByQuery({
      activeSearchQuery: activeLibrarySearchQuery,
      loops: savedLoops,
    });
  }, [activeLibrarySearchQuery, savedLoops]);
  const visiblePlaylistCards = useMemo(() => {
    return resolveSavedPlaylistCards(
      filterSavedPlaylistsByQuery({
        activeSearchQuery: activeLibrarySearchQuery,
        playlists: savedPlaylists,
      }),
    );
  }, [activeLibrarySearchQuery, savedPlaylists]);
  const isLibrarySearchMode = activeLibrarySearchQuery !== null;
  const selectedLoopViewSource =
    savedLibrarySources.find((source) => {
      return source.id === selectedLoopViewSourceId;
    }) ?? null;
  const selectedLoopViewLoops = useMemo(() => {
    if (!selectedLoopViewSourceId) {
      return [];
    }

    return getSavedRehearsalLibraryDependentLoops(
      savedLoops,
      selectedLoopViewSourceId,
    );
  }, [savedLoops, selectedLoopViewSourceId]);
  const selectedTrackLoopPlaybackPlaylist = useMemo(() => {
    if (!selectedLoopViewSource) {
      return null;
    }

    return buildTrackScopedLoopPlaybackPlaylist({
      loops: selectedLoopViewLoops,
      source: selectedLoopViewSource,
    });
  }, [selectedLoopViewLoops, selectedLoopViewSource]);
  const selectedTrackLoopSession =
    selectedTrackLoopPlaybackPlaylist &&
    activePlaylistSession?.playlistId === selectedTrackLoopPlaybackPlaylist.id
      ? activePlaylistSession
      : null;
  const selectedCardRenameIssue =
    cardRenameIssue ??
    getSelectedPlaylistIssue(playlistIssue, cardRenamePlaylistId);
  const savedSourceTitle = isLibrarySearchMode
    ? `Matching saved rehearsal tracks (${visibleSavedLibrarySources.length})`
    : `Saved rehearsal tracks (${savedLibrarySources.length})`;
  const isLoopMutating = pendingLoopId !== null;
  const shouldShowSavedLibraryStatus =
    isSavedLibraryLoading || savedLibraryStatusCopy.tone !== 'ready';
  const shouldShowPlaybackStatus =
    savedTrackPlaybackStatusCopy !== null &&
    (isSavedTrackPlaybackLoading ||
      savedTrackPlaybackStatusCopy.tone !== 'ready');
  const currentLoopBuilderSourceId = selectedTrack?.source.id ?? null;
  const selectedTrackLoopDetailCopy = selectedLoopViewSource
    ? getTrackScopedLoopDetailCopy({
        loopCount: selectedLoopViewLoops.length,
        sourceName: selectedLoopViewSource.name,
      })
    : null;
  const selectedTrackLoopPlaybackAction = getPlaylistPlaybackActionCopy({
    activeSession: selectedTrackLoopSession,
    isPreparing: isPlaybackPreparing,
    mode: 'ordered',
    playbackState,
    selectedPlaylist: selectedTrackLoopPlaybackPlaylist,
  });
  const detailMode = resolveSavedRehearsalLibraryDetailMode({
    isPlaylistDetailVisible,
    selectedLoopViewSourceId,
  });
  const isTrackLoopDetailVisible = detailMode === 'track-loop-detail';
  const isPlaylistDetailMode = detailMode === 'playlist-detail';

  useEffect(() => {
    if (!isLibrarySearchMode || selectedLoopViewSourceId === null) {
      return;
    }

    setSelectedLoopViewSourceId(null);
  }, [isLibrarySearchMode, selectedLoopViewSourceId]);

  useEffect(() => {
    if (selectedLoopViewSourceId === null) {
      return;
    }

    const hasSelectedSource = savedLibrarySources.some((source) => {
      return source.id === selectedLoopViewSourceId;
    });
    const hasTrackScopedLoops =
      getSavedRehearsalLibraryDependentLoops(
        savedLoops,
        selectedLoopViewSourceId,
      ).length > 0;

    if (
      !hasSelectedSource ||
      (!hasTrackScopedLoops &&
        currentLoopBuilderSourceId !== selectedLoopViewSourceId)
    ) {
      setSelectedLoopViewSourceId(null);
    }
  }, [
    currentLoopBuilderSourceId,
    savedLibrarySources,
    savedLoops,
    selectedLoopViewSourceId,
  ]);

  const closeTrackLoopView = () => {
    if (currentLoopBuilderSourceId === selectedLoopViewSourceId) {
      setSelectedLoopSourceId(null);
    }

    setSelectedLoopEditId(null);
    setSelectedLoopViewSourceId(null);
  };

  const closeLoopBuilder = () => {
    setSelectedLoopEditId(null);
    setSelectedLoopSourceId(null);
  };

  const openLoopEditor = (loop: NamedLoop) => {
    const source = savedLibrarySources.find((savedSource) => {
      return savedSource.id === loop.sourceId;
    });

    if (!source) {
      return;
    }

    const beginLoopEdit = () => {
      setSelectedLoopEditId(loop.id);
      openLoopBuilderForSource(source);
    };

    beginLoopEdit();
  };

  const openLoopPlaylistSelector = (loopId: string) => {
    setTrackPlaylistCreationIssue(null);
    dispatchTrackPlaylistMenu({
      type: 'open-loop-selector',
      loopId,
    });
  };

  const closePlaylistDetail = () => {
    setIsPlaylistDetailVisible(false);
  };

  const playTrackLoopSeries = (loopId?: string) => {
    if (!selectedTrackLoopPlaybackPlaylist) {
      return;
    }

    const startEntryId = loopId
      ? selectedTrackLoopPlaybackPlaylist.items.find((entry) => {
          return entry.loopId === loopId;
        })?.id
      : undefined;

    void togglePlaylistPlayback({
      loops: savedLoops,
      mode: 'ordered',
      playlist: selectedTrackLoopPlaybackPlaylist,
      sources: savedLibrarySources,
      startEntryId,
    });
  };

  const persistPlaylist = async (
    playlist: Playlist,
    buildNextPlaylist: (playlist: Playlist) => Playlist,
  ) => {
    const persistedPlaylist = await updatePlaylist(buildNextPlaylist(playlist));

    if (persistedPlaylist) {
      setSelectedPlaylistId(persistedPlaylist.id);
    }

    return persistedPlaylist;
  };

  const closeTrackPlaylistMenu = () => {
    dispatchTrackPlaylistMenu({ type: 'close' });
    setTrackPlaylistCreationIssue(null);
  };

  const runLibrarySearch = (query: string) => {
    const nextQuery = normalizeRecentSearchTerm(query);

    setLibrarySearchQuery(nextQuery ?? '');
    setActiveLibrarySearchQuery(resolveActiveLibrarySearchQuery(query));

    if (nextQuery) {
      setRecentLibrarySearchTerms((currentSearchTerms) => {
        return recordRecentSearchTerm(currentSearchTerms, nextQuery);
      });
    }
  };

  const submitLibrarySearch = () => {
    runLibrarySearch(librarySearchQuery);
  };

  const handleLibrarySearchQueryChange = (value: string) => {
    setLibrarySearchQuery(value);

    if (resolveActiveLibrarySearchQuery(value)) {
      return;
    }

    setActiveLibrarySearchQuery(null);
  };

  const clearLibrarySearch = () => {
    setLibrarySearchQuery('');
    setActiveLibrarySearchQuery(null);
  };

  const handleSelectPlaylistForAddTarget = async (playlist: Playlist) => {
    if (selectedTrackMenuSource) {
      const persistedPlaylist = await persistPlaylist(
        playlist,
        (nextPlaylist) => {
          return addTrackToPlaylist(nextPlaylist, selectedTrackMenuSource);
        },
      );

      if (persistedPlaylist) {
        closeTrackPlaylistMenu();
      }

      return;
    }

    if (!selectedTrackMenuLoop) {
      return;
    }

    const persistedPlaylist = await persistPlaylist(
      playlist,
      (nextPlaylist) => {
        return addLoopToPlaylist(nextPlaylist, selectedTrackMenuLoop);
      },
    );

    if (persistedPlaylist) {
      closeTrackPlaylistMenu();
    }
  };

  const handleCreatePlaylistForAddTarget = async () => {
    if (!selectedTrackMenuSource && !selectedTrackMenuLoop) {
      return;
    }

    const result = buildSavedPlaylist({
      name: trackPlaylistMenuState.draftName,
      ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
    });

    if (result.issue || !result.playlist) {
      setTrackPlaylistCreationIssue(result.issue);
      return;
    }

    let playlistWithTarget: Playlist;

    if (selectedTrackMenuSource) {
      playlistWithTarget = addTrackToPlaylist(
        result.playlist,
        selectedTrackMenuSource,
      );
    } else {
      if (!selectedTrackMenuLoop) {
        return;
      }

      playlistWithTarget = addLoopToPlaylist(
        result.playlist,
        selectedTrackMenuLoop,
      );
    }

    const createdPlaylist = await createPlaylist(playlistWithTarget);

    if (!createdPlaylist) {
      return;
    }

    setSelectedPlaylistId(createdPlaylist.id);
    closeTrackPlaylistMenu();
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const playlist = savedPlaylists.find((currentPlaylist) => {
      return currentPlaylist.id === playlistId;
    });

    if (!playlist) {
      return;
    }

    const removalCopy = getSavedPlaylistRemovalCopy(playlist);

    Alert.alert(removalCopy.title, removalCopy.message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: removalCopy.confirmLabel,
        style: 'destructive',
        onPress: () => {
          void deletePlaylist(playlist);
        },
      },
    ]);
  };

  const closeCardRenameDialog = () => {
    setCardRenameIssue(null);
    setCardRenamePlaylistId(null);
    setCardRenamePlaylistName('');
  };

  const openCardRenameDialog = (playlistId: string) => {
    const playlist = savedPlaylists.find((currentPlaylist) => {
      return currentPlaylist.id === playlistId;
    });

    if (!playlist) {
      return;
    }

    setCardRenameIssue(null);
    setCardRenamePlaylistId(playlist.id);
    setCardRenamePlaylistName(playlist.name);
  };

  const handleRenamePlaylistCard = async () => {
    if (!cardRenamePlaylistId) {
      return;
    }

    const playlist = savedPlaylists.find((currentPlaylist) => {
      return currentPlaylist.id === cardRenamePlaylistId;
    });

    if (!playlist) {
      closeCardRenameDialog();
      return;
    }

    const nextRenameIssue = validatePlaylistName(cardRenamePlaylistName);

    if (nextRenameIssue) {
      setCardRenameIssue(nextRenameIssue);
      return;
    }

    setCardRenameIssue(null);

    const persistedPlaylist = await updatePlaylist(
      renamePlaylist(playlist, cardRenamePlaylistName),
    );

    if (!persistedPlaylist) {
      return;
    }

    closeCardRenameDialog();
  };

  const trackLoopView =
    selectedLoopViewSource && selectedTrackLoopDetailCopy
      ? {
          detailCopy: selectedTrackLoopDetailCopy,
          isMakeNewLoopDisabled:
            !canMutateLoops ||
            isLoopMutating ||
            pendingLoopBuilderSourceId !== null ||
            selectedLoopViewSource.availability.status !== 'available',
          loops: selectedLoopViewLoops,
          makeNewLoopLabel:
            pendingLoopBuilderSourceId === selectedLoopViewSource.id
              ? 'Preparing loop…'
              : 'Make new loop',
          onClose: closeTrackLoopView,
          onMakeNewLoop: () => {
            setSelectedLoopEditId(null);
            openLoopBuilderForSource(selectedLoopViewSource);
          },
          onPlayLoopSeries: playTrackLoopSeries,
          orderedPlaybackAction: selectedTrackLoopPlaybackAction,
        }
      : null;

  const loopSection = (
    <SavedLoopSection
      activePlayableItem={activePlayableItem}
      canMutateLoops={canMutateLoops}
      canMutatePlaylists={canMutatePlaylists}
      editingLoop={selectedLoopEdit}
      isPlaylistMutating={isPlaylistMutating}
      canQueueAsNext={canQueueAsNext}
      highlightQuery={activeLibrarySearchQuery}
      isPlaybackPreparing={isPlaybackPreparing}
      isTrackLoopDetailVisible={isTrackLoopDetailVisible}
      isSavedLoopsLoading={isSavedLoopsLoading}
      pendingLoopId={pendingLoopId}
      playbackIssue={playbackIssue}
      playbackState={playbackState}
      onEditLoop={openLoopEditor}
      onOpenLoopPlaylistSelector={openLoopPlaylistSelector}
      onCloseLoopBuilder={closeLoopBuilder}
      removeLoop={removeLoop}
      savedSources={savedLibrarySources}
      savedLoopIssue={savedLoopIssue}
      savedLoops={visibleSavedLoops}
      saveLoop={saveLoop}
      selectedTrack={selectedTrack}
      toggleActivePlayback={toggleActivePlayback}
      togglePlayableItemPlayback={togglePlayableItemPlayback}
      queuePlayableItemNext={queuePlayableItemNext}
      queuePlayableItemUpNext={queuePlayableItemUpNext}
      trackLoopView={isTrackLoopDetailVisible ? trackLoopView : null}
    />
  );

  const playlistSection = (
    <SavedPlaylistSection
      activePlaylistSession={activePlaylistSession}
      canMutatePlaylists={canMutatePlaylists}
      createPlaylist={createPlaylist}
      deletePlaylist={deletePlaylist}
      getCurrentScrollOffsetY={getCurrentScrollOffsetY}
      isDetailVisible={isPlaylistDetailMode}
      isLoading={isPlaylistsLoading}
      isPlaybackPreparing={isPlaybackPreparing}
      issue={playlistIssue}
      onCloseDetail={closePlaylistDetail}
      pendingPlaylistId={pendingPlaylistId}
      playbackState={playbackState}
      savedPlaylists={savedPlaylists}
      savedLoops={savedLoops}
      savedSources={savedLibrarySources}
      selectedPlaylist={selectedPlaylist}
      setSelectedPlaylistId={setSelectedPlaylistId}
      setIsReorderDragActive={setIsPlaylistReorderDragActive}
      setReorderDragMoveY={setPlaylistReorderDragMoveY}
      toggleActivePlayback={toggleActivePlayback}
      togglePlaylistPlayback={togglePlaylistPlayback}
      updatePlaylist={updatePlaylist}
    />
  );

  const detailSection = isPlaylistDetailMode
    ? playlistSection
    : isTrackLoopDetailVisible
      ? loopSection
      : null;

  return (
    <View style={styles.savedLibrarySection}>
      <DriveLibrarySectionHeader
        canRefresh={false}
        isLoading={false}
        onRefresh={() => undefined}
        title="Saved tracks"
        eyebrow="Saved tracks"
      />
      <LibrarySearchPanel
        isSearchMode={isLibrarySearchMode}
        onClearSearch={clearLibrarySearch}
        onSearch={submitLibrarySearch}
        onSearchQueryChange={handleLibrarySearchQueryChange}
        onSelectRecentSearchTerm={runLibrarySearch}
        recentSearchTerms={recentLibrarySearchTerms}
        searchQuery={librarySearchQuery}
      />
      {shouldShowSavedLibraryStatus ? (
        <DriveLibraryStatusCard
          isLoading={isSavedLibraryLoading}
          loadingLabel="Refreshing saved rehearsal tracks…"
          statusCopy={savedLibraryStatusCopy}
        />
      ) : null}
      {savedTrackPlaybackStatusCopy && shouldShowPlaybackStatus ? (
        <DriveLibraryStatusCard
          isLoading={isSavedTrackPlaybackLoading}
          loadingLabel="Starting track playback…"
          statusCopy={savedTrackPlaybackStatusCopy}
        />
      ) : null}
      {detailMode === 'browse' ? (
        <>
          <SavedPlaylistCardsList
            cardRenameIssue={selectedCardRenameIssue}
            cardRenamePlaylistId={cardRenamePlaylistId}
            cardRenamePlaylistName={cardRenamePlaylistName}
            canMutatePlaylists={canMutatePlaylists}
            highlightQuery={activeLibrarySearchQuery}
            isMutating={isPlaylistMutating}
            onBeginRenamePlaylist={openCardRenameDialog}
            onCancelRenamePlaylist={closeCardRenameDialog}
            onDeletePlaylist={handleDeletePlaylist}
            onPlayPlaylist={(playlistId) => {
              const playlist = savedPlaylists.find((currentPlaylist) => {
                return currentPlaylist.id === playlistId;
              });

              if (!playlist) {
                return;
              }

              void togglePlaylistPlayback({
                loops: savedLoops,
                mode: 'ordered',
                playlist,
                sources: savedLibrarySources,
              });
            }}
            onRenamePlaylistNameChange={(value) => {
              setCardRenamePlaylistName(value);
              setCardRenameIssue(null);
            }}
            onSelectPlaylist={(playlistId) => {
              setSelectedPlaylistId(playlistId);
              setIsPlaylistDetailVisible(true);
            }}
            onSubmitRenamePlaylist={() => {
              void handleRenamePlaylistCard();
            }}
            playlistCards={visiblePlaylistCards}
            selectedPlaylistId={selectedPlaylist?.id ?? null}
          />
          <DriveLibrarySourceGroup
            getActions={(source) => {
              const isPending = pendingSourceId === source.id;
              const trackPlayableItem = createTrackPlayableItem(source);
              const playbackAction = getSavedTrackPlaybackActionCopy({
                activePlayableItem,
                isPreparing: isPlaybackPreparing,
                playableItem: trackPlayableItem,
                playbackState,
              });
              const isPlaybackSourceActive = isSavedTrackPlaybackActive(
                activePlayableItem,
                trackPlayableItem,
              );
              const isLoopBuilderPreparing =
                pendingLoopBuilderSourceId !== null;
              const isPreparingLoopSource =
                pendingLoopBuilderSourceId === source.id;

              return resolveSavedTrackRowActions({
                canMutateLibrary,
                canMutateLoops,
                canMutatePlaylists,
                canQueueAsNext,
                hasSavedLoops:
                  getSavedRehearsalLibraryDependentLoops(savedLoops, source.id)
                    .length > 0,
                hasAvailableSource: source.availability.status === 'available',
                isLoopBuilderPreparing,
                isLoopMutating,
                isPendingLoopSource: isPreparingLoopSource,
                isPendingRemoval: isPending,
                isPlaybackSourceActive,
                isPlaylistMutating,
                isSavedLibraryMutating,
                onOpenLoopBuilder: () => {
                  setSelectedLoopEditId(null);
                  openLoopBuilderForSource(source);
                },
                onOpenPlaylistSelector: () => {
                  setTrackPlaylistCreationIssue(null);
                  dispatchTrackPlaylistMenu({
                    type: 'open',
                    sourceId: source.id,
                  });
                },
                onQueueNext: () => {
                  queuePlayableItemNext(trackPlayableItem);
                },
                onQueueUpNext: () => {
                  queuePlayableItemUpNext(trackPlayableItem);
                },
                onRemove: () => {
                  removeSource(source);
                },
                onTogglePlayback: () => {
                  void toggleSourcePlayback(source);
                },
                onViewTrackLoops: () => {
                  setSelectedLoopEditId(null);
                  setSelectedLoopViewSourceId(source.id);
                },
                playbackAction,
                sourceName: source.name,
              });
            }}
            getMessage={(source) => {
              return (
                getSavedRehearsalLibrarySourceIssue(
                  savedLibraryIssue,
                  source,
                  'remove',
                ) ??
                getSavedTrackPlaybackItemIssue(
                  playbackIssue,
                  createTrackPlayableItem(source),
                )
              );
            }}
            highlightQuery={activeLibrarySearchQuery}
            sources={visibleSavedLibrarySources}
            title={savedSourceTitle}
          />
          {loopSection}
          {playlistSection}
        </>
      ) : (
        detailSection
      )}

      <SavedTrackPlaylistMenuSurface
        createPlaylistIssue={trackPlaylistCreationIssue}
        draftName={trackPlaylistMenuState.draftName}
        isMutating={isPlaylistMutating}
        onClose={closeTrackPlaylistMenu}
        onDraftNameChange={(value) => {
          setTrackPlaylistCreationIssue(null);
          dispatchTrackPlaylistMenu({
            type: 'update-draft',
            value,
          });
        }}
        onSelectPlaylist={(playlist) => {
          void handleSelectPlaylistForAddTarget(playlist);
        }}
        onShowCreatePlaylist={() => {
          setTrackPlaylistCreationIssue(null);
          dispatchTrackPlaylistMenu({ type: 'open-create' });
        }}
        onShowPlaylistSelector={() => {
          setTrackPlaylistCreationIssue(null);
          dispatchTrackPlaylistMenu(
            trackPlaylistMenuState.step === 'create'
              ? { type: 'cancel-create' }
              : { type: 'open-selector' },
          );
        }}
        onSubmitNewPlaylist={() => {
          void handleCreatePlaylistForAddTarget();
        }}
        selectedLoop={selectedTrackMenuLoop}
        playlists={savedPlaylists}
        selectedSource={selectedTrackMenuSource}
        step={trackPlaylistMenuState.step}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  savedLibrarySection: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: '#faf6ee',
  },
});
