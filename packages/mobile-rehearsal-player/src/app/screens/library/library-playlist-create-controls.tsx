import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Playlist } from '@org/audio-library-models';

import { SurfaceIconButton } from '../../components/surface-icon-button';
import { SavedPlaylistCreateDialog } from '../../library/playlists/components/saved-playlist-create-dialog';
import {
  buildSavedPlaylist,
  type PlaylistDraftIssue,
  type SavedPlaylistIssue,
} from '../../library/playlists/utils/saved-playlist-view-model';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../library/storage/local-library-storage';

type LibraryPlaylistCreateControlsProps = {
  canMutatePlaylists: boolean;
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  isVisible: boolean;
  onPlaylistCreateDialogVisibilityChange?: (isVisible: boolean) => void;
  onSelectPlaylist?: (playlistId: string) => void;
  playlistIssue: SavedPlaylistIssue | null;
};

export const LibraryPlaylistCreateControls = ({
  canMutatePlaylists,
  createPlaylist,
  isVisible,
  onPlaylistCreateDialogVisibilityChange,
  onSelectPlaylist,
  playlistIssue,
}: LibraryPlaylistCreateControlsProps) => {
  const [isPlaylistDialogVisible, setIsPlaylistDialogVisible] = useState(false);
  const [isPlaylistMutating, setIsPlaylistMutating] = useState(false);
  const [playlistDraftIssue, setPlaylistDraftIssue] =
    useState<PlaylistDraftIssue | null>(null);
  const [playlistDraftName, setPlaylistDraftName] = useState('');

  useEffect(() => {
    onPlaylistCreateDialogVisibilityChange?.(isPlaylistDialogVisible);
  }, [isPlaylistDialogVisible, onPlaylistCreateDialogVisibilityChange]);

  const handleSubmitPlaylist = useCallback(() => {
    const buildResult = buildSavedPlaylist({
      name: playlistDraftName,
      ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
    });

    if (buildResult.issue || !buildResult.playlist) {
      setPlaylistDraftIssue(buildResult.issue);
      return;
    }

    setIsPlaylistMutating(true);

    void (async () => {
      const persistedPlaylist = await createPlaylist(buildResult.playlist);

      setIsPlaylistMutating(false);

      if (!persistedPlaylist) {
        setPlaylistDraftIssue(
          playlistIssue ?? {
            message: 'The playlist could not be created right now.',
            title: 'Could not create playlist',
          },
        );
        return;
      }

      setPlaylistDraftIssue(null);
      setPlaylistDraftName('');
      setIsPlaylistDialogVisible(false);
      onSelectPlaylist?.(persistedPlaylist.id);
    })();
  }, [createPlaylist, onSelectPlaylist, playlistDraftName, playlistIssue]);

  return (
    <>
      {isVisible ? (
        <View pointerEvents="box-none" style={styles.playlistCreateDock}>
          <SurfaceIconButton
            accessibilityLabel="Create playlist"
            disabled={!canMutatePlaylists || isPlaylistMutating}
            icon="plus"
            onPress={() => {
              setPlaylistDraftIssue(null);
              setPlaylistDraftName('');
              setIsPlaylistDialogVisible(true);
            }}
            size={24}
            style={styles.playlistCreateButton}
            tone="primary"
          />
        </View>
      ) : null}
      <SavedPlaylistCreateDialog
        isMutating={isPlaylistMutating}
        isVisible={isPlaylistDialogVisible}
        issue={playlistDraftIssue}
        onCancel={() => {
          setPlaylistDraftIssue(null);
          setPlaylistDraftName('');
          setIsPlaylistDialogVisible(false);
        }}
        onChange={(value) => {
          setPlaylistDraftIssue(null);
          setPlaylistDraftName(value);
        }}
        onSubmit={handleSubmitPlaylist}
        value={playlistDraftName}
      />
    </>
  );
};

const styles = StyleSheet.create({
  playlistCreateButton: {
    width: 58,
    height: 58,
  },
  playlistCreateDock: {
    position: 'absolute',
    right: 18,
    bottom: 10,
    zIndex: 15,
  },
});
