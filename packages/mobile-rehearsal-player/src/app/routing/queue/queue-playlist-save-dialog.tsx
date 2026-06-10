import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { PlaylistDraftIssue } from '../../library/utils/saved-playlist-view-model';
import { appTheme } from '../../utils/theme';

type QueuePlaylistSaveDialogProps = {
  isMutating: boolean;
  isVisible: boolean;
  issue: PlaylistDraftIssue | null;
  value: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export const QueuePlaylistSaveDialog = ({
  isMutating,
  isVisible,
  issue,
  value,
  onCancel,
  onChange,
  onSubmit,
}: QueuePlaylistSaveDialogProps) => {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={isVisible}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Create new playlist</Text>
          <Text style={styles.body}>
            Create a new playlist from the current Up Next order. Unsaved queued
            tracks will be added to Library first.
          </Text>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            onChangeText={onChange}
            placeholder="Wednesday rehearsal"
            placeholderTextColor="#857b6c"
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
                pressed && !isMutating ? styles.buttonPressed : undefined,
                isMutating ? styles.buttonDisabled : undefined,
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
                pressed && !isMutating ? styles.buttonPressed : undefined,
                isMutating ? styles.buttonDisabled : undefined,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>
                {isMutating ? 'Creating…' : 'Create playlist'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
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
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#fffdf8',
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
  nameInput: {
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: appTheme.colors.primaryText,
    backgroundColor: '#fffdf8',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(31, 28, 23, 0.35)',
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#305c4d',
  },
  primaryButtonLabel: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
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
