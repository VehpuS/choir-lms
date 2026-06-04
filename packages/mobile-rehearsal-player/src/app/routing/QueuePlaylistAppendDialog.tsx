import type { Playlist } from '@org/audio-library-models';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { PlaylistDraftIssue } from '../library/utils/saved-playlist-view-model';
import { appTheme } from '../utils/theme';

type QueuePlaylistAppendDialogProps = {
  isMutating: boolean;
  isVisible: boolean;
  issue: PlaylistDraftIssue | null;
  playlists: Playlist[];
  onCancel: () => void;
  onSelectPlaylist: (playlistId: string) => void;
};

const getPlaylistItemCountLabel = (playlist: Playlist) => {
  const itemCount = playlist.items.length;

  return `${itemCount} item${itemCount === 1 ? '' : 's'}`;
};

export const QueuePlaylistAppendDialog = ({
  isMutating,
  isVisible,
  issue,
  playlists,
  onCancel,
  onSelectPlaylist,
}: QueuePlaylistAppendDialogProps) => {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={isVisible}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Append queue to playlist</Text>
          <Text style={styles.body}>
            Add the current Up Next order to one of your saved playlists.
            Unsaved queued tracks will be added to Library first.
          </Text>

          {issue ? (
            <View style={styles.issueCard}>
              <Text style={styles.issueTitle}>{issue.title}</Text>
              <Text style={styles.issueMessage}>{issue.message}</Text>
            </View>
          ) : null}

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
                      onSelectPlaylist(playlist.id);
                    }}
                    style={({ pressed }) => [
                      styles.playlistRow,
                      pressed && !isMutating ? styles.buttonPressed : undefined,
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
              <Text style={styles.emptyStateBody}>
                Save the queue as a new playlist first.
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={isMutating}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && !isMutating ? styles.buttonPressed : undefined,
              isMutating ? styles.buttonDisabled : undefined,
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  body: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  card: {
    gap: 12,
    width: '92%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fffdf8',
  },
  emptyStateBody: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyStateCard: {
    gap: 4,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#faf6ee',
  },
  emptyStateTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  issueCard: {
    gap: 4,
    borderWidth: 1,
    borderColor: '#e5c7a4',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#fff3e2',
  },
  issueMessage: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  issueTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(31, 28, 23, 0.35)',
  },
  playlistList: {
    maxHeight: 320,
  },
  playlistListContent: {
    gap: 10,
  },
  playlistMetadata: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    lineHeight: 16,
  },
  playlistName: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  playlistRow: {
    gap: 4,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#faf6ee',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#fffdf8',
  },
  secondaryButtonLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: appTheme.colors.primaryText,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
});
