import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { CenteredDialogCard } from '../../components/centered-dialog-card';
import { savedPlaylistSectionStyles as styles } from '../../components/saved-playlist-section-styles';
import { MAX_RECORDING_NAME_LENGTH } from '../recording-save-sheet-model';

export const DELETE_RECORDING_NOTE =
  'The recording is removed from this device. Copies already on Drive stay there.';

type DialogButtonProps = {
  label: string;
  onPress: () => void;
  primary?: boolean;
};

const DialogButton = ({ label, onPress, primary }: DialogButtonProps) => (
  <Pressable
    accessibilityRole="button"
    {...interactionGuardProps}
    onPress={onPress}
    style={({ pressed }) => [
      primary ? styles.primaryButton : styles.secondaryButton,
      buttonInteractionGuardStyle,
      pressed ? styles.actionButtonPressed : undefined,
    ]}
  >
    <Text
      style={primary ? styles.primaryButtonLabel : styles.secondaryButtonLabel}
    >
      {label}
    </Text>
  </Pressable>
);

type RenameRecordingDialogProps = {
  name: string;
  onCancel: () => void;
  /** Called with what was typed; the host trims it and keeps the old name if it is blank. */
  onSave: (typed: string) => void;
};

export const RenameRecordingDialog = ({
  name,
  onCancel,
  onSave,
}: RenameRecordingDialogProps) => {
  const [typed, setTyped] = useState(name);

  return (
    <CenteredDialogCard isVisible onRequestClose={onCancel}>
      <Text style={styles.groupTitle}>Rename recording</Text>
      <TextInput
        accessibilityLabel="Recording name"
        autoCorrect={false}
        autoFocus
        maxLength={MAX_RECORDING_NAME_LENGTH}
        onChangeText={setTyped}
        onSubmitEditing={() => onSave(typed)}
        returnKeyType="done"
        selectTextOnFocus
        style={styles.nameInput}
        value={typed}
      />
      <View style={styles.actionRow}>
        <DialogButton label="Cancel" onPress={onCancel} />
        <DialogButton label="Save name" onPress={() => onSave(typed)} primary />
      </View>
    </CenteredDialogCard>
  );
};

type DeleteRecordingDialogProps = {
  name: string;
  onCancel: () => void;
  onDelete: () => void;
};

export const DeleteRecordingDialog = ({
  name,
  onCancel,
  onDelete,
}: DeleteRecordingDialogProps) => (
  <CenteredDialogCard isVisible onRequestClose={onCancel}>
    <Text style={styles.groupTitle}>{`Delete “${name}”?`}</Text>
    <Text style={styles.sectionBody}>{DELETE_RECORDING_NOTE}</Text>
    <View style={styles.actionRow}>
      <DialogButton label="Cancel" onPress={onCancel} />
      <DialogButton label="Delete" onPress={onDelete} primary />
    </View>
  </CenteredDialogCard>
);

type DeleteRecordingsDialogProps = {
  title: string;
  onCancel: () => void;
  onDelete: () => void;
};

/** The confirmation for deleting a selection of recordings. */
export const DeleteRecordingsDialog = ({
  title,
  onCancel,
  onDelete,
}: DeleteRecordingsDialogProps) => (
  <CenteredDialogCard isVisible onRequestClose={onCancel}>
    <Text style={styles.groupTitle}>{title}</Text>
    <Text style={styles.sectionBody}>{DELETE_RECORDING_NOTE}</Text>
    <View style={styles.actionRow}>
      <DialogButton label="Cancel" onPress={onCancel} />
      <DialogButton label="Delete" onPress={onDelete} primary />
    </View>
  </CenteredDialogCard>
);
