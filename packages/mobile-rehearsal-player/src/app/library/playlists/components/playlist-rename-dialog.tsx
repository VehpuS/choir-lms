import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { OptionsMenuSheet } from '../../components/options-menu-sheet';
import {
  SAVED_PLAYLIST_PLACEHOLDER_TEXT,
  savedPlaylistSectionStyles as styles,
} from '../../components/saved-playlist-section-styles';
import {
  getPlaylistOptionsMenuActions,
  type PlaylistDraftIssue,
} from '../utils/saved-playlist-view-model';

type PlaylistRenameDialogProps = {
  isMutating: boolean;
  isVisible: boolean;
  issue: PlaylistDraftIssue | null;
  playlistName: string;
  value: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

type PlaylistOptionsMenuSurfaceProps = {
  isMutating: boolean;
  isVisible: boolean;
  playlistName: string;
  onClose: () => void;
  onRemove?: () => void;
  onRename: () => void;
};

export const PlaylistRenameDialog = ({
  isMutating,
  isVisible,
  issue,
  playlistName,
  value,
  onCancel,
  onChange,
  onSubmit,
}: PlaylistRenameDialogProps) => {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={isVisible}
    >
      <View style={dialogStyles.overlay}>
        <View style={dialogStyles.card}>
          <Text style={styles.groupTitle}>Rename playlist</Text>
          <Text style={styles.sectionBody}>
            Update the title for {playlistName}.
          </Text>
          <TextInput
            autoCorrect={false}
            autoFocus
            onChangeText={onChange}
            placeholder="Rename this playlist"
            placeholderTextColor={SAVED_PLAYLIST_PLACEHOLDER_TEXT}
            returnKeyType="done"
            style={styles.nameInput}
            value={value}
          />
          {issue ? (
            <View style={styles.issueCard}>
              <Text style={styles.issueTitle}>{issue.title}</Text>
              <Text style={styles.issueMessage}>{issue.message}</Text>
            </View>
          ) : null}
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={isMutating}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && !isMutating ? styles.actionButtonPressed : undefined,
                isMutating ? styles.actionButtonDisabled : undefined,
              ]}
            >
              <Text style={styles.secondaryButtonLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isMutating}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !isMutating ? styles.actionButtonPressed : undefined,
                isMutating ? styles.actionButtonDisabled : undefined,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>
                {isMutating ? 'Saving…' : 'Save name'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const PlaylistOptionsMenuSurface = ({
  isMutating,
  isVisible,
  playlistName,
  onClose,
  onRemove,
  onRename,
}: PlaylistOptionsMenuSurfaceProps) => {
  return (
    <OptionsMenuSheet
      actions={getPlaylistOptionsMenuActions({
        isMutating,
        onRemove,
        onRename,
      })}
      isSecondaryDisabled={isMutating}
      isVisible={isVisible}
      onClose={onClose}
      title={playlistName}
    />
  );
};

const dialogStyles = StyleSheet.create({
  card: {
    gap: 12,
    width: '92%',
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fffdf8',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(31, 28, 23, 0.35)',
  },
});
