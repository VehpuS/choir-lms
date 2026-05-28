import type { Playlist } from '@org/audio-library-models';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
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

const BACKDROP = 'rgba(20, 18, 13, 0.42)';
const CARD_BACKGROUND = '#fffdf8';
const INPUT_BACKGROUND = '#fff9f0';
const PRIMARY_ACTION_BACKGROUND = '#305c4d';
const PRIMARY_ACTION_TEXT = '#fff8ef';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_ACTION_BACKGROUND = '#f2ece1';
const SECONDARY_TEXT = '#5f5647';

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
      <Modal animationType="slide" onRequestClose={onClose} transparent visible>
        <View style={styles.sheetOverlay}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.backdrop}
          />
          <View style={styles.sheet}>
            <View style={styles.copyGroup}>
              <Text style={styles.eyebrow}>More options</Text>
              <Text style={styles.title}>{menuCopy.title}</Text>
              <Text style={styles.detailLabel}>{menuCopy.detailLabel}</Text>
              <Text style={styles.locationLabel}>{menuCopy.locationLabel}</Text>
            </View>

            <View style={styles.actionColumn}>
              <Pressable
                accessibilityRole="button"
                disabled={isMutating}
                onPress={onShowPlaylistSelector}
                style={({ pressed }) => [
                  styles.primaryAction,
                  pressed && !isMutating ? styles.buttonPressed : undefined,
                  isMutating ? styles.buttonDisabled : undefined,
                ]}
              >
                <Text style={styles.primaryActionLabel}>Add to playlist</Text>
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
          </View>
        </View>
      </Modal>
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

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: BACKDROP,
  },
  dialogOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: BACKDROP,
  },
  dialogBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: CARD_BACKGROUND,
  },
  dialogCard: {
    gap: 16,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    borderRadius: 24,
    backgroundColor: CARD_BACKGROUND,
  },
  copyGroup: {
    gap: 6,
  },
  eyebrow: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: PRIMARY_TEXT,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  detailLabel: {
    color: PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  locationLabel: {
    color: SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  dialogTitle: {
    color: PRIMARY_TEXT,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  dialogBody: {
    color: SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  playlistList: {
    maxHeight: 240,
  },
  playlistListContent: {
    gap: 10,
  },
  playlistRow: {
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 16,
    backgroundColor: '#fffaf2',
  },
  playlistName: {
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  playlistMetadata: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyStateCard: {
    gap: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 16,
    backgroundColor: '#fffaf2',
  },
  emptyStateTitle: {
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  emptyStateBody: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  nameInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 16,
    backgroundColor: INPUT_BACKGROUND,
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '600',
  },
  issueCard: {
    gap: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff1ed',
  },
  issueTitle: {
    color: '#8a2d1f',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  issueMessage: {
    color: '#8a2d1f',
    fontSize: 13,
    lineHeight: 18,
  },
  actionColumn: {
    gap: 10,
  },
  primaryAction: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
  },
  primaryActionLabel: {
    color: PRIMARY_ACTION_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryAction: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: SECONDARY_ACTION_BACKGROUND,
  },
  secondaryActionLabel: {
    color: PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.56,
  },
});
