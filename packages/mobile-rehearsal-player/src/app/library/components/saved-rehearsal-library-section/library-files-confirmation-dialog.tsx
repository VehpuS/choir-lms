import { Pressable, Text, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { CenteredDialogCard } from '../centered-dialog-card';
import { savedPlaylistSectionStyles as styles } from '../saved-playlist-section-styles';

export type LibraryFilesConfirmationDialogContent = {
  confirmLabel: string;
  message: string;
  title: string;
};

type LibraryFilesConfirmationDialogProps = {
  content: LibraryFilesConfirmationDialogContent | null;
  isMutating: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const LibraryFilesConfirmationDialog = ({
  content,
  isMutating,
  onCancel,
  onConfirm,
}: LibraryFilesConfirmationDialogProps) => {
  if (!content) {
    return null;
  }

  return (
    <CenteredDialogCard isVisible onRequestClose={onCancel}>
      <Text style={styles.groupTitle}>{content.title}</Text>
      <Text style={styles.sectionBody}>{content.message}</Text>
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
          onPress={onConfirm}
          style={({ pressed }) => [
            styles.destructiveButton,
            buttonInteractionGuardStyle,
            pressed && !isMutating ? styles.actionButtonPressed : undefined,
            isMutating ? styles.actionButtonDisabled : undefined,
          ]}
        >
          <Text style={styles.destructiveButtonLabel}>
            {isMutating ? 'Working...' : content.confirmLabel}
          </Text>
        </Pressable>
      </View>
    </CenteredDialogCard>
  );
};
