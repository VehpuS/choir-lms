import { Pressable, Text, TextInput, View } from 'react-native';

import { CenteredDialogCard } from '../centered-dialog-card';
import { FeedbackCard } from '../feedback-card';
import {
  SAVED_PLAYLIST_PLACEHOLDER_TEXT,
  savedPlaylistSectionStyles as styles,
} from '../saved-playlist-section-styles';

type LibraryFilesFolderCreateDialogProps = {
  isMutating: boolean;
  isVisible: boolean;
  issue: {
    message: string;
    title: string;
  } | null;
  value: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export const LibraryFilesFolderCreateDialog = ({
  isMutating,
  isVisible,
  issue,
  value,
  onCancel,
  onChange,
  onSubmit,
}: LibraryFilesFolderCreateDialogProps) => {
  if (!isVisible) {
    return null;
  }

  return (
    <CenteredDialogCard isVisible={isVisible} onRequestClose={onCancel}>
      <Text style={styles.groupTitle}>Create folder</Text>
      <Text style={styles.sectionBody}>
        Create a new folder in the current Library Files location.
      </Text>
      <TextInput
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus
        onChangeText={onChange}
        placeholder="Warmups"
        placeholderTextColor={SAVED_PLAYLIST_PLACEHOLDER_TEXT}
        returnKeyType="done"
        style={styles.nameInput}
        value={value}
      />
      {issue ? (
        <FeedbackCard
          message={issue.message}
          size="compact"
          title={issue.title}
          tone="error"
        />
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
            {isMutating ? 'Creating…' : 'Create folder'}
          </Text>
        </Pressable>
      </View>
    </CenteredDialogCard>
  );
};