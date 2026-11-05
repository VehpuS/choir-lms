import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { CenteredDialogCard } from '../../components/centered-dialog-card';
import { savedPlaylistSectionStyles as styles } from '../../components/saved-playlist-section-styles';

const AUTO_DISMISS_MS = 3000;

type RecordingNoticeDialogProps = {
  message: string;
  onDismiss: () => void;
  title: string;
};

/**
 * A short confirmation for a surface that has no toast of its own (the
 * playback sheet). It closes by itself after a few seconds, or on `OK`.
 */
export const RecordingNoticeDialog = ({
  message,
  onDismiss,
  title,
}: RecordingNoticeDialogProps) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <CenteredDialogCard isVisible onRequestClose={onDismiss}>
      <Text style={styles.groupTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        {...interactionGuardProps}
        onPress={onDismiss}
        style={({ pressed }) => [
          styles.primaryButton,
          buttonInteractionGuardStyle,
          pressed ? styles.actionButtonPressed : undefined,
        ]}
      >
        <Text style={styles.primaryButtonLabel}>OK</Text>
      </Pressable>
    </CenteredDialogCard>
  );
};
