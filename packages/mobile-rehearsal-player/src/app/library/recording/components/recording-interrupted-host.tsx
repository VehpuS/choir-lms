import { Pressable, Text, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { CenteredDialogCard } from '../../components/centered-dialog-card';
import { savedPlaylistSectionStyles as styles } from '../../components/saved-playlist-section-styles';
import { describeInterruptedTake } from '../recording-interrupted-model';
import { useInterruptedTakes } from '../use-interrupted-takes';

/** Offers back a take that a crash or a closed tab left unfinished. */
export const RecordingInterruptedHost = () => {
  const { current, discard, keep, later } = useInterruptedTakes();

  if (!current) {
    return null;
  }

  return (
    <CenteredDialogCard isVisible onRequestClose={later}>
      <Text style={styles.groupTitle}>Recording interrupted</Text>
      <Text style={styles.sectionBody}>{describeInterruptedTake(current)}</Text>
      <View style={styles.actionRow}>
        <Pressable
          accessibilityLabel="Discard the interrupted recording"
          accessibilityRole="button"
          {...interactionGuardProps}
          onPress={() => void discard()}
          style={({ pressed }) => [
            styles.destructiveButton,
            buttonInteractionGuardStyle,
            pressed ? styles.actionButtonPressed : undefined,
          ]}
        >
          <Text style={styles.destructiveButtonLabel}>Discard</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Keep the interrupted recording"
          accessibilityRole="button"
          {...interactionGuardProps}
          onPress={() => void keep()}
          style={({ pressed }) => [
            styles.primaryButton,
            buttonInteractionGuardStyle,
            pressed ? styles.actionButtonPressed : undefined,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>Keep</Text>
        </Pressable>
      </View>
    </CenteredDialogCard>
  );
};
