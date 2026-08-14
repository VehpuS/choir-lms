import { Pressable, Text, TextInput, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { CenteredDialogCard } from '../../components/centered-dialog-card';
import { FeedbackCard } from '../../components/feedback-card';
import {
  SAVED_PLAYLIST_PLACEHOLDER_TEXT,
  savedPlaylistSectionStyles as styles,
} from '../../components/saved-playlist-section-styles';
import {
  getSavedPlaylistCreateDialogCopy,
  type PlaylistDraftIssue,
} from '../utils/saved-playlist-view-model';

type SavedPlaylistCreateDialogProps = {
  destinationFolderName?: string | null;
  isMutating: boolean;
  isVisible: boolean;
  issue: PlaylistDraftIssue | null;
  value: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export const SavedPlaylistCreateDialog = ({
  destinationFolderName,
  isMutating,
  isVisible,
  issue,
  value,
  onCancel,
  onChange,
  onSubmit,
}: SavedPlaylistCreateDialogProps) => {
  const createCopy = getSavedPlaylistCreateDialogCopy({
    destinationFolderName,
  });

  if (!isVisible) {
    return null;
  }

  return (
    <CenteredDialogCard isVisible={isVisible} onRequestClose={onCancel}>
      <Text style={styles.groupTitle}>{createCopy.title}</Text>
      <Text style={styles.sectionBody}>{createCopy.body}</Text>
      <TextInput
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus
        onChangeText={onChange}
        placeholder={createCopy.placeholder}
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
          {...interactionGuardProps}
          disabled={isMutating}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.secondaryButton,
            buttonInteractionGuardStyle,
            pressed && !isMutating ? styles.actionButtonPressed : undefined,
            isMutating ? styles.actionButtonDisabled : undefined,
          ]}
        >
          <Text style={styles.secondaryButtonLabel}>
            {createCopy.cancelLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          {...interactionGuardProps}
          disabled={isMutating}
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            buttonInteractionGuardStyle,
            pressed && !isMutating ? styles.actionButtonPressed : undefined,
            isMutating ? styles.actionButtonDisabled : undefined,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {isMutating ? createCopy.savingLabel : createCopy.submitLabel}
          </Text>
        </Pressable>
      </View>
    </CenteredDialogCard>
  );
};
