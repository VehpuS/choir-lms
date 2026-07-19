import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { CenteredDialogCard } from '../centered-dialog-card';
import { savedPlaylistSectionStyles as styles } from '../saved-playlist-section-styles';

export type LibraryFilesConfirmationDialogContent = {
  affectedSections?: Array<{
    items: string[];
    title: string;
  }>;
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
      {content.affectedSections?.length ? (
        <ScrollView
          contentContainerStyle={styles.confirmationAffectedListContent}
          style={styles.confirmationAffectedList}
        >
          {content.affectedSections.map((section) => (
            <View key={section.title} style={styles.confirmationAffectedGroup}>
              <Text style={styles.confirmationAffectedTitle}>
                {section.title}
              </Text>
              {section.items.map((item, itemIndex) => (
                <Text
                  key={`${section.title}:${item}:${itemIndex}`}
                  style={styles.confirmationAffectedItem}
                >
                  {item}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
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
