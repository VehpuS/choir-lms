import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import type { TrackRenameCopiesChoice } from '../../saved-rehearsal-library/track-rename-model';
import { CenteredDialogCard } from '../centered-dialog-card';
import { savedPlaylistSectionStyles as styles } from '../saved-playlist-section-styles';

type TrackRenameCopiesDialogProps = {
  copyCount: number;
  isMutating: boolean;
  isVisible: boolean;
  newName: string;
  onCancel: () => void;
  /** `remember` is true when the user asked to skip this prompt next time. */
  onChoose: (choice: TrackRenameCopiesChoice, remember: boolean) => void;
  previousName: string;
};

export const REMEMBER_CHOICE_LABEL = 'Remember my choice';
export const RENAME_ALL_COPIES_LABEL = 'Rename all copies and the track';
export const RENAME_THIS_COPY_LABEL = 'Rename this copy only';

// Asked when a track with several copies in Files is renamed from one of them.
export const TrackRenameCopiesDialog = ({
  copyCount,
  isMutating,
  isVisible,
  newName,
  onCancel,
  onChoose,
  previousName,
}: TrackRenameCopiesDialogProps) => {
  const [remember, setRemember] = useState(false);

  if (!isVisible) {
    return null;
  }

  const renderChoice = (
    choice: TrackRenameCopiesChoice,
    label: string,
    isPrimary: boolean,
  ) => (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      {...interactionGuardProps}
      disabled={isMutating}
      onPress={() => {
        onChoose(choice, remember);
      }}
      style={({ pressed }) => [
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        buttonInteractionGuardStyle,
        pressed && !isMutating ? styles.actionButtonPressed : undefined,
        isMutating ? styles.actionButtonDisabled : undefined,
      ]}
    >
      <Text
        style={
          isPrimary ? styles.primaryButtonLabel : styles.secondaryButtonLabel
        }
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <CenteredDialogCard isVisible={isVisible} onRequestClose={onCancel}>
      <Text style={styles.groupTitle}>Rename “{previousName}”</Text>
      <Text style={styles.sectionBody}>
        This track has {copyCount} copies in Files. Rename them all and the
        track to “{newName}”, or only this copy?
      </Text>
      {renderChoice('all', RENAME_ALL_COPIES_LABEL, true)}
      {renderChoice('this', RENAME_THIS_COPY_LABEL, false)}
      <View style={styles.actionRow}>
        <Text style={styles.sectionBody}>{REMEMBER_CHOICE_LABEL}</Text>
        <Switch
          accessibilityLabel={REMEMBER_CHOICE_LABEL}
          onValueChange={setRemember}
          value={remember}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        {...interactionGuardProps}
        disabled={isMutating}
        onPress={onCancel}
        style={[styles.secondaryButton, buttonInteractionGuardStyle]}
      >
        <Text style={styles.secondaryButtonLabel}>Cancel</Text>
      </Pressable>
    </CenteredDialogCard>
  );
};
