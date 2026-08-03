import { Pressable, Text, TextInput, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
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
    recovery?: {
      kind: 'use-suggested-name';
      label: string;
      suggestedName: string;
    };
    title: string;
  } | null;
  value: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onRecoverSuggestedName: (suggestedName: string) => void;
  onSubmit: () => void;
};

export const LibraryFilesFolderCreateDialog = ({
  isMutating,
  isVisible,
  issue,
  value,
  onCancel,
  onChange,
  onRecoverSuggestedName,
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
          footer={
            issue.recovery?.kind === 'use-suggested-name' ? (
              <Pressable
                accessibilityRole="button"
                {...interactionGuardProps}
                disabled={isMutating}
                onPress={() => {
                  onRecoverSuggestedName(
                    issue.recovery?.suggestedName ?? value,
                  );
                }}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  buttonInteractionGuardStyle,
                  pressed && !isMutating
                    ? styles.actionButtonPressed
                    : undefined,
                  isMutating ? styles.actionButtonDisabled : undefined,
                ]}
              >
                <Text style={styles.secondaryButtonLabel}>
                  {issue.recovery.label}
                </Text>
              </Pressable>
            ) : null
          }
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
          <Text style={styles.secondaryButtonLabel}>Cancel</Text>
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
            {isMutating ? 'Creating…' : 'Create folder'}
          </Text>
        </Pressable>
      </View>
    </CenteredDialogCard>
  );
};
