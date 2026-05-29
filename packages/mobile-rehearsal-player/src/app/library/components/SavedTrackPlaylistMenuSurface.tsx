import type { Playlist } from '@org/audio-library-models';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { DriveLibrarySource } from '../utils/drive-library-view-model';
import type { PlaylistDraftIssue } from '../utils/saved-playlist-view-model';
import {
  getSavedTrackContextMenuCopy,
  type SavedTrackPlaylistMenuState,
} from '../utils/saved-track-playlist-menu-view-model';
import { OptionsMenuSheet } from './OptionsMenuSheet';
import { savedTrackPlaylistMenuSurfaceStyles as styles } from './saved-track-playlist-menu-surface-styles';

type SavedTrackPlaylistMenuSurfaceProps = {
  createPlaylistIssue: PlaylistDraftIssue | null;
  draftName: string;
  isMutating: boolean;
  onClose: () => void;
  onDraftNameChange: (value: string) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onShowCreatePlaylist: () => void;
  onShowPlaylistSelector: () => void;
  onSubmitNewPlaylist: () => void;
  playlists: Playlist[];
  selectedSource: DriveLibrarySource | null;
  step: SavedTrackPlaylistMenuState['step'];
};

const getPlaylistItemCountLabel = (playlist: Playlist) => {
  const itemCount = playlist.items.length;

  return `${itemCount} item${itemCount === 1 ? '' : 's'}`;
};

export const SavedTrackPlaylistMenuSurface = ({
  createPlaylistIssue,
  draftName,
  isMutating,
  onClose,
  onDraftNameChange,
  onSelectPlaylist,
  onShowCreatePlaylist,
  onShowPlaylistSelector,
  onSubmitNewPlaylist,
  playlists,
  selectedSource,
  step,
}: SavedTrackPlaylistMenuSurfaceProps) => {
  if (step === 'hidden' || !selectedSource) {
    return null;
  }

  const menuCopy = getSavedTrackContextMenuCopy(selectedSource);

  if (step === 'menu') {
    return (
      <OptionsMenuSheet
        actions={[
          {
            disabled: isMutating,
            id: 'add-to-playlist',
            label: 'Add to playlist',
            onPress: onShowPlaylistSelector,
            tone: 'primary',
          },
        ]}
        isSecondaryDisabled={isMutating}
        isVisible
        onClose={onClose}
        title={menuCopy.title}
      />
    );
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.dialogOverlay}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.dialogBackdrop}
        />
        <View style={styles.dialogCard}>
          {step === 'selector' ? (
            <>
              <Text style={styles.dialogTitle}>Add to playlist</Text>

              {playlists.length > 0 ? (
                <ScrollView
                  contentContainerStyle={styles.playlistListContent}
                  style={styles.playlistList}
                >
                  {playlists.map((playlist) => {
                    return (
                      <Pressable
                        accessibilityRole="button"
                        disabled={isMutating}
                        key={playlist.id}
                        onPress={() => {
                          onSelectPlaylist(playlist);
                        }}
                        style={({ pressed }) => [
                          styles.playlistRow,
                          pressed && !isMutating
                            ? styles.buttonPressed
                            : undefined,
                          isMutating ? styles.buttonDisabled : undefined,
                        ]}
                      >
                        <Text style={styles.playlistName}>{playlist.name}</Text>
                        <Text style={styles.playlistMetadata}>
                          {getPlaylistItemCountLabel(playlist)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateTitle}>No playlists yet</Text>
                  <Text style={styles.emptyStateBody}>Create one to add this track.</Text>
                </View>
              )}

              <View style={styles.actionColumn}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isMutating}
                  onPress={onShowCreatePlaylist}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && !isMutating ? styles.buttonPressed : undefined,
                    isMutating ? styles.buttonDisabled : undefined,
                  ]}
                >
                  <Text style={styles.secondaryActionLabel}>
                    + New playlist
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isMutating}
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && !isMutating ? styles.buttonPressed : undefined,
                    isMutating ? styles.buttonDisabled : undefined,
                  ]}
                >
                  <Text style={styles.secondaryActionLabel}>Cancel</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.dialogTitle}>New playlist</Text>
              <TextInput
                autoCapitalize="words"
                autoCorrect={false}
                onChangeText={onDraftNameChange}
                placeholder="Wednesday rehearsal"
                placeholderTextColor="#857b6c"
                returnKeyType="done"
                style={styles.nameInput}
                value={draftName}
              />

              {createPlaylistIssue ? (
                <View style={styles.issueCard}>
                  <Text style={styles.issueTitle}>
                    {createPlaylistIssue.title}
                  </Text>
                  <Text style={styles.issueMessage}>
                    {createPlaylistIssue.message}
                  </Text>
                </View>
              ) : null}

              <View style={styles.actionColumn}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isMutating}
                  onPress={onSubmitNewPlaylist}
                  style={({ pressed }) => [
                    styles.primaryAction,
                    pressed && !isMutating ? styles.buttonPressed : undefined,
                    isMutating ? styles.buttonDisabled : undefined,
                  ]}
                >
                  <Text style={styles.primaryActionLabel}>
                    {isMutating ? 'Creating playlist…' : 'Create'}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isMutating}
                  onPress={onShowPlaylistSelector}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && !isMutating ? styles.buttonPressed : undefined,
                    isMutating ? styles.buttonDisabled : undefined,
                  ]}
                >
                  <Text style={styles.secondaryActionLabel}>Cancel</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};
