import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { SurfaceIconButton } from '../../components/surface-icon-button';
import { OptionsMenuSheet } from '../../library/components/options-menu-sheet';
import { SavedRehearsalLibrarySection } from '../../library/components/saved-rehearsal-library-section';
import { LibraryFilesFolderCreateDialog } from '../../library/components/saved-rehearsal-library-section/library-files-folder-create-dialog';
import { SavedRehearsalLibraryHeader } from '../../library/components/saved-rehearsal-library-section/search-shell';
import { useSavedRehearsalLibrarySearch } from '../../library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search';
import { useSavedRehearsalLibrarySearchPanel } from '../../library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search-panel';
import { LoopPreviewPlaybackContext } from '../../library/loops/components/loop-preview-playback-context';
import type { useSavedTrackPlayback } from '../../library/playback/hooks/use-saved-track-playback';
import { SavedPlaylistCreateDialog } from '../../library/playlists/components/saved-playlist-create-dialog';
import { resolveSavedPlaylistDetailEdgeAutoscrollDelta } from '../../library/playlists/utils/saved-playlist-detail-view-model';
import {
  buildSavedPlaylist,
  type PlaylistDraftIssue,
} from '../../library/playlists/utils/saved-playlist-view-model';
import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';
import type { useRehearsalLibraryController } from '../../library/saved-rehearsal-library/use-rehearsal-library-controller';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../library/storage/local-library-storage';
import { appTheme } from '../../utils/theme';

type SavedTrackPlaybackController = Pick<
  ReturnType<typeof useSavedTrackPlayback>,
  | 'activePlaylistSession'
  | 'activePlayableItem'
  | 'isPreparing'
  | 'issue'
  | 'playbackState'
  | 'progress'
  | 'queuePlayableItemNext'
  | 'queuePlayableItemUpNext'
  | 'seekActivePlaybackToPosition'
  | 'syncActivePlaylistContext'
  | 'toggleActivePlayback'
  | 'togglePlayableItemPlayback'
  | 'togglePlaylistPlayback'
  | 'toggleSourcePlayback'
>;

type LibraryScreenProps = {
  authorization: DriveSessionMenuController;
  libraryController: ReturnType<typeof useRehearsalLibraryController>;
  onRequestAddDestination: () => void;
  playback: SavedTrackPlaybackController;
};

type MeasurableScrollView = ScrollView & {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

export const LibraryScreen = ({
  authorization,
  libraryController,
  onRequestAddDestination,
  playback,
}: LibraryScreenProps) => {
  const [selectedView, setSelectedView] =
    useState<SavedRehearsalLibraryView>('files');
  const [filesCreateIssue, setFilesCreateIssue] = useState<{
    message: string;
    title: string;
  } | null>(null);
  const [filesFolderDraftName, setFilesFolderDraftName] = useState('');
  const [filesPlaylistDraftIssue, setFilesPlaylistDraftIssue] =
    useState<PlaylistDraftIssue | null>(null);
  const [filesPlaylistDraftName, setFilesPlaylistDraftName] = useState('');
  const [isFilesCreateMenuVisible, setIsFilesCreateMenuVisible] =
    useState(false);
  const [isFilesExplorerVisible, setIsFilesExplorerVisible] = useState(false);
  const [isFilesFolderDialogVisible, setIsFilesFolderDialogVisible] =
    useState(false);
  const [isFilesFolderMutating, setIsFilesFolderMutating] = useState(false);
  const [isFilesPlaylistDialogVisible, setIsFilesPlaylistDialogVisible] =
    useState(false);
  const [isFilesPlaylistMutating, setIsFilesPlaylistMutating] = useState(false);
  const [isSessionMenuVisible, setIsSessionMenuVisible] = useState(false);
  const [isPlaylistReorderDragActive, setIsPlaylistReorderDragActive] =
    useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollOffsetYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportTopInWindowRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const searchState = useSavedRehearsalLibrarySearch({
    savedLibrarySources: libraryController.savedLibrary.savedLibrarySources,
    savedLoops: libraryController.savedLibrary.savedLoops,
    savedPlaylists: libraryController.playlists.savedPlaylists,
  });
  const searchPanel = useSavedRehearsalLibrarySearchPanel({
    searchState,
  });
  const filesExplorer = libraryController.savedLibrary.files.explorer;
  const filesFolderLabel = filesExplorer?.currentFolder.name ?? 'Files';

  const resetFilesCreateDialogs = useCallback(() => {
    setFilesCreateIssue(null);
    setFilesFolderDraftName('');
    setFilesPlaylistDraftIssue(null);
    setFilesPlaylistDraftName('');
    setIsFilesFolderDialogVisible(false);
    setIsFilesPlaylistDialogVisible(false);
  }, []);

  const handleSubmitFilesFolder = useCallback(() => {
    const folderName = filesFolderDraftName.trim();

    if (!folderName) {
      setFilesCreateIssue({
        message: 'Enter a folder name.',
        title: 'Folder name required',
      });
      return;
    }

    setIsFilesFolderMutating(true);

    void (async () => {
      const didCreate =
        await libraryController.savedLibrary.files.createFolder(folderName);

      setIsFilesFolderMutating(false);

      if (!didCreate) {
        setFilesCreateIssue(
          libraryController.savedLibrary.files.issue ?? {
            message:
              'The current Library Files folder could not be created right now.',
            title: 'Could not create folder',
          },
        );
        return;
      }

      setFilesCreateIssue(null);
      setFilesFolderDraftName('');
      setIsFilesFolderDialogVisible(false);
    })();
  }, [filesFolderDraftName, libraryController.savedLibrary.files]);

  const handleSubmitFilesPlaylist = useCallback(() => {
    const buildResult = buildSavedPlaylist({
      name: filesPlaylistDraftName,
      ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
    });

    if (buildResult.issue || !buildResult.playlist) {
      setFilesPlaylistDraftIssue(buildResult.issue);
      return;
    }

    setIsFilesPlaylistMutating(true);

    void (async () => {
      const createdPlaylist = await libraryController.playlists.createPlaylist(
        buildResult.playlist,
      );

      if (!createdPlaylist) {
        setFilesPlaylistDraftIssue(
          libraryController.playlists.issue ?? {
            message:
              'The Library Files playlist could not be created right now.',
            title: 'Could not create playlist',
          },
        );
        setIsFilesPlaylistMutating(false);
        return;
      }

      const currentFolderId =
        libraryController.savedLibrary.files.explorer?.currentFolder.id ?? null;
      const rootFolderId = libraryController.savedLibrary.files.rootFolderId;

      if (currentFolderId && rootFolderId && currentFolderId !== rootFolderId) {
        const didLink =
          await libraryController.savedLibrary.files.linkEntityToCurrentFolder(
            'playlist',
            createdPlaylist.id,
          );

        if (!didLink) {
          setFilesPlaylistDraftIssue(
            libraryController.savedLibrary.files.issue ?? {
              message:
                'The new playlist was saved, but it could not be added to this Files folder.',
              title: 'Playlist saved outside folder',
            },
          );
          setIsFilesPlaylistMutating(false);
          return;
        }
      }

      setIsFilesPlaylistMutating(false);
      setFilesPlaylistDraftIssue(null);
      setFilesPlaylistDraftName('');
      setIsFilesPlaylistDialogVisible(false);
    })();
  }, [
    filesPlaylistDraftName,
    libraryController.playlists,
    libraryController.savedLibrary.files,
  ]);

  const filesCreateActions = [
    {
      id: 'create-folder',
      label: 'Create folder',
      onPress: () => {
        setIsFilesCreateMenuVisible(false);
        setFilesCreateIssue(null);
        setIsFilesFolderDialogVisible(true);
      },
      tone: 'primary' as const,
    },
    {
      id: 'add-tracks-from-drive',
      label: 'Add tracks from Drive',
      onPress: () => {
        setIsFilesCreateMenuVisible(false);
        libraryController.savedLibrary.files.stageDriveImportForCurrentFolder();
        onRequestAddDestination();
      },
      tone: 'secondary' as const,
    },
    {
      id: 'create-playlist',
      label: 'Create playlist',
      onPress: () => {
        setIsFilesCreateMenuVisible(false);
        setFilesPlaylistDraftIssue(null);
        setIsFilesPlaylistDialogVisible(true);
      },
      tone: 'secondary' as const,
    },
  ];

  const refreshViewportBounds = useCallback(() => {
    const measurableScrollView =
      scrollViewRef.current as MeasurableScrollView | null;

    measurableScrollView?.measureInWindow((_x, y, _width, height) => {
      viewportTopInWindowRef.current = y;
      viewportHeightRef.current = height;
    });
  }, []);

  const setPlaylistReorderDragActive = useCallback(
    (isActive: boolean) => {
      if (isActive) {
        refreshViewportBounds();
      }

      setIsPlaylistReorderDragActive(isActive);
    },
    [refreshViewportBounds],
  );

  const setPlaylistReorderDragMoveY = useCallback(
    (moveY: number) => {
      if (!isPlaylistReorderDragActive) {
        return;
      }

      const viewportHeight = viewportHeightRef.current;
      const viewportTop = viewportTopInWindowRef.current;
      const moveYWithinViewport = moveY - viewportTop;

      if (viewportHeight <= 0) {
        return;
      }

      const scrollDelta = resolveSavedPlaylistDetailEdgeAutoscrollDelta({
        moveY: moveYWithinViewport,
        viewportHeight,
      });

      if (scrollDelta === 0) {
        return;
      }

      const maxOffset = Math.max(contentHeightRef.current - viewportHeight, 0);
      const nextOffset = Math.max(
        0,
        Math.min(scrollOffsetYRef.current + scrollDelta, maxOffset),
      );

      if (nextOffset === scrollOffsetYRef.current) {
        return;
      }

      scrollOffsetYRef.current = nextOffset;
      scrollViewRef.current?.scrollTo({
        y: nextOffset,
        animated: false,
      });
    },
    [isPlaylistReorderDragActive],
  );

  return (
    <View style={styles.screen}>
      {isSessionMenuVisible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setIsSessionMenuVisible(false);
          }}
          style={styles.menuBackdrop}
        />
      ) : null}
      <SavedRehearsalLibraryHeader
        authorization={authorization}
        handleFilterActionPress={searchPanel.handleFilterActionPress}
        handleSearchActionPress={searchPanel.handleSearchActionPress}
        isSessionMenuVisible={isSessionMenuVisible}
        onCloseSessionMenu={() => {
          setIsSessionMenuVisible(false);
        }}
        onToggleSessionMenu={() => {
          setIsSessionMenuVisible((currentValue) => !currentValue);
        }}
        searchPanelVisibility={searchPanel.searchPanelVisibility}
        searchState={searchState}
        style={styles.destinationHeader}
      />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.content,
          isFilesExplorerVisible ? styles.contentWithFilesCreateDock : null,
        ]}
        onContentSizeChange={(_, contentHeight) => {
          contentHeightRef.current = contentHeight;
        }}
        onLayout={(event) => {
          viewportHeightRef.current = event.nativeEvent.layout.height;
          refreshViewportBounds();
        }}
        onScroll={(event) => {
          scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEnabled={!isPlaylistReorderDragActive}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <LoopPreviewPlaybackContext.Provider
          value={{
            playbackPositionSeconds: playback.progress.position,
            seekActivePlaybackToPosition: playback.seekActivePlaybackToPosition,
          }}
        >
          <SavedRehearsalLibrarySection
            activePlayableItem={playback.activePlayableItem}
            activePlaylistSession={playback.activePlaylistSession}
            canMutateLibrary={libraryController.savedLibrary.canMutateLibrary}
            canMutateLoops={libraryController.savedLibrary.canMutateLoops}
            canMutatePlaylists={libraryController.playlists.canMutatePlaylists}
            createPlaylist={libraryController.playlists.createPlaylist}
            deletePlaylist={libraryController.playlists.deletePlaylist}
            getCurrentScrollOffsetY={() => {
              return scrollOffsetYRef.current;
            }}
            isPlaybackPreparing={playback.isPreparing}
            isPlaylistsLoading={libraryController.playlists.isLoading}
            isSavedLibraryLoading={libraryController.savedLibrary.isLoading}
            isSavedLoopsLoading={
              libraryController.savedLibrary.isSavedLoopsLoading
            }
            libraryFiles={libraryController.savedLibrary.files}
            openLoopBuilderForSource={
              libraryController.savedLibrary.openLoopBuilderForSource
            }
            onFilesExplorerVisibilityChange={setIsFilesExplorerVisible}
            pendingLoopBuilderSourceId={
              libraryController.savedLibrary.pendingLoopBuilderSourceId
            }
            pendingLoopId={libraryController.savedLibrary.pendingLoopId}
            pendingPlaylistId={libraryController.playlists.pendingPlaylistId}
            pendingSourceId={libraryController.savedLibrary.pendingSourceId}
            playbackIssue={playback.issue}
            playbackState={playback.playbackState}
            playlistIssue={libraryController.playlists.issue}
            queuePlayableItemNext={playback.queuePlayableItemNext}
            queuePlayableItemUpNext={playback.queuePlayableItemUpNext}
            removeLoop={libraryController.savedLibrary.removeLoop}
            removeSource={libraryController.savedLibrary.removeSource}
            savedLibraryIssue={libraryController.savedLibrary.savedLibraryIssue}
            savedLibrarySources={
              libraryController.savedLibrary.savedLibrarySources
            }
            savedLibraryStatusCopy={
              libraryController.savedLibrary.savedLibraryStatusCopy
            }
            savedLoopIssue={libraryController.savedLibrary.savedLoopIssue}
            savedLoops={libraryController.savedLibrary.savedLoops}
            savedPlaylists={libraryController.playlists.savedPlaylists}
            savedTrackPlaybackStatusCopy={
              libraryController.savedLibrary.savedTrackPlaybackStatusCopy
            }
            saveLoop={libraryController.savedLibrary.saveLoop}
            saveSource={libraryController.savedLibrary.saveSource}
            searchPanel={searchPanel}
            searchState={searchState}
            selectedTrack={libraryController.savedLibrary.selectedLoopTrack}
            selectedView={selectedView}
            setIsPlaylistReorderDragActive={setPlaylistReorderDragActive}
            setPlaylistReorderDragMoveY={setPlaylistReorderDragMoveY}
            setSelectedLoopSourceId={
              libraryController.savedLibrary.setSelectedLoopSourceId
            }
            setSelectedView={setSelectedView}
            syncActivePlaylistContext={playback.syncActivePlaylistContext}
            toggleActivePlayback={playback.toggleActivePlayback}
            togglePlayableItemPlayback={playback.togglePlayableItemPlayback}
            togglePlaylistPlayback={playback.togglePlaylistPlayback}
            toggleSourcePlayback={playback.toggleSourcePlayback}
            updatePlaylist={libraryController.playlists.updatePlaylist}
          />
        </LoopPreviewPlaybackContext.Provider>
      </ScrollView>
      {isFilesExplorerVisible ? (
        <View pointerEvents="box-none" style={styles.filesCreateDock}>
          <SurfaceIconButton
            accessibilityLabel={`Create in ${filesFolderLabel}`}
            icon="plus"
            onPress={() => {
              setIsFilesCreateMenuVisible(true);
            }}
            size={24}
            style={styles.filesCreateButton}
            tone="primary"
          />
        </View>
      ) : null}
      <OptionsMenuSheet
        actions={filesCreateActions}
        isVisible={isFilesCreateMenuVisible}
        onClose={() => {
          setIsFilesCreateMenuVisible(false);
        }}
        title={`Create in ${filesFolderLabel}`}
      />
      <LibraryFilesFolderCreateDialog
        isMutating={isFilesFolderMutating}
        isVisible={isFilesFolderDialogVisible}
        issue={filesCreateIssue}
        onCancel={() => {
          setFilesCreateIssue(null);
          setFilesFolderDraftName('');
          setIsFilesFolderDialogVisible(false);
        }}
        onChange={(value) => {
          setFilesCreateIssue(null);
          setFilesFolderDraftName(value);
        }}
        onSubmit={handleSubmitFilesFolder}
        value={filesFolderDraftName}
      />
      <SavedPlaylistCreateDialog
        isMutating={isFilesPlaylistMutating}
        isVisible={isFilesPlaylistDialogVisible}
        issue={filesPlaylistDraftIssue}
        onCancel={() => {
          setFilesPlaylistDraftIssue(null);
          setFilesPlaylistDraftName('');
          setIsFilesPlaylistDialogVisible(false);
        }}
        onChange={(value) => {
          setFilesPlaylistDraftIssue(null);
          setFilesPlaylistDraftName(value);
        }}
        onSubmit={handleSubmitFilesPlaylist}
        value={filesPlaylistDraftName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
  content: {
    gap: 14,
    paddingTop: 12,
    paddingBottom: 20,
  },
  contentWithFilesCreateDock: {
    paddingBottom: 188,
  },
  destinationHeader: {
    marginTop: 12,
  },
  filesCreateButton: {
    width: 58,
    height: 58,
  },
  filesCreateDock: {
    position: 'absolute',
    right: 18,
    bottom: 10,
    zIndex: 15,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
    backgroundColor: appTheme.colors.pageBackground,
  },
});
