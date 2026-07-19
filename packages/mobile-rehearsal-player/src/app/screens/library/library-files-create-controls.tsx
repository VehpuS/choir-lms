import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Playlist } from '@org/audio-library-models';
import { SurfaceIconButton } from '../../components/surface-icon-button';
import { OptionsMenuSheet } from '../../library/components/options-menu-sheet';
import { LibraryFilesFolderCreateDialog } from '../../library/components/saved-rehearsal-library-section/library-files-folder-create-dialog';
import { SavedPlaylistCreateDialog } from '../../library/playlists/components/saved-playlist-create-dialog';
import {
  buildSavedPlaylist,
  type PlaylistDraftIssue,
  type SavedPlaylistIssue,
} from '../../library/playlists/utils/saved-playlist-view-model';
import type { UseLibraryFilesResult } from '../../library/saved-rehearsal-library/use-library-files';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../library/storage/local-library-storage';
import { createPlaylistWithFilesLocation } from './library-files-playlist-create';

type LibraryFilesCreateControlsProps = {
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  files: UseLibraryFilesResult;
  isVisible: boolean;
  onRequestAddDestination: () => void;
  playlistIssue: SavedPlaylistIssue | null;
};

export const LibraryFilesCreateControls = ({
  createPlaylist,
  files,
  isVisible,
  onRequestAddDestination,
  playlistIssue,
}: LibraryFilesCreateControlsProps) => {
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
  const [isFilesFolderDialogVisible, setIsFilesFolderDialogVisible] =
    useState(false);
  const [isFilesFolderMutating, setIsFilesFolderMutating] = useState(false);
  const [isFilesPlaylistDialogVisible, setIsFilesPlaylistDialogVisible] =
    useState(false);
  const [isFilesPlaylistMutating, setIsFilesPlaylistMutating] = useState(false);
  const filesFolderLabel = files.explorer?.currentFolder.name ?? 'Files';

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
      const didCreate = await files.createFolder(folderName);

      setIsFilesFolderMutating(false);

      if (!didCreate) {
        setFilesCreateIssue(
          files.issue ?? {
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
  }, [files, filesFolderDraftName]);

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
      const createdPlaylist = await createPlaylistWithFilesLocation({
        createPlaylist,
        files,
        playlist: buildResult.playlist,
      });

      if (!createdPlaylist) {
        setFilesPlaylistDraftIssue(
          playlistIssue ?? {
            message:
              'The Library Files playlist could not be created right now.',
            title: 'Could not create playlist',
          },
        );
        setIsFilesPlaylistMutating(false);
        return;
      }

      setIsFilesPlaylistMutating(false);
      setFilesPlaylistDraftIssue(null);
      setFilesPlaylistDraftName('');
      setIsFilesPlaylistDialogVisible(false);
    })();
  }, [createPlaylist, files, filesPlaylistDraftName, playlistIssue]);

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
        files.stageDriveImportForCurrentFolder();
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

  return (
    <>
      {isVisible ? (
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
    </>
  );
};

const styles = StyleSheet.create({
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
});
