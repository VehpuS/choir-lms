import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { AllowSavingStep } from './allow-saving-step';
import { describeAllowSavingStep } from './allow-saving-step-model';
import { DEVICE_FILE_REFUSAL_COPY } from './device-file-model';
import {
  SOURCE_REMOVED_MESSAGE,
  describeSaveFailure,
  type SaveFlowState,
} from './save-flow-model';

export type SaveFlowPanelProps = {
  /** True once the user has been through the Google permission screen. */
  hasAskedForPermission: boolean;
  hasWriteAccess: boolean;
  isAuthorizing: boolean;
  onAllowSaving: () => void;
  onCancelUpload: () => void;
  onChangeFolder: () => void;
  onChooseFile: () => void;
  onClose: () => void;
  onOpenLink: () => void;
  onRetry: () => void;
  state: SaveFlowState;
};

/**
 * The body of the Save to Drive sheet for every step but the folder choice
 * (which is its own sheet): the permission step, the link and file steps, the
 * upload with its cancel, and a failure with its next step.
 */
export const SaveFlowPanel = (props: SaveFlowPanelProps) => {
  const { state } = props;

  if (state.step === 'folder') {
    return null;
  }

  if (!props.hasWriteAccess && state.step !== 'saved') {
    const step = describeAllowSavingStep({
      hasAskedForPermission:
        props.hasAskedForPermission && !props.isAuthorizing,
      hasWriteAccess: false,
    });

    return step.state === 'ready' ? null : (
      <View style={styles.stack}>
        <AllowSavingStep
          isBusy={props.isAuthorizing}
          onAllow={props.onAllowSaving}
          step={step}
        />
        <OutlinedActionButton
          accessibilityLabel="Back"
          label="Back"
          onPress={props.onClose}
        />
      </View>
    );
  }

  if (state.step === 'uploading') {
    return (
      <View style={styles.stack}>
        <Text style={styles.title}>
          {`Saving ${state.file?.name ?? 'the file'} to ${state.target?.folderName ?? 'Drive'}…`}
        </Text>
        <Text style={styles.copy}>
          Nothing changes in the track until it has saved.
        </Text>
        <OutlinedActionButton
          accessibilityLabel="Cancel"
          label="Cancel"
          onPress={props.onCancelUpload}
        />
      </View>
    );
  }

  if (state.step === 'failed' && state.failure) {
    const copy = describeSaveFailure(state.failure);
    const actions = {
      'allow-saving': props.onAllowSaving,
      'change-folder': props.onChangeFolder,
      close: props.onClose,
      retry: props.onRetry,
    };

    return (
      <View accessibilityRole="alert" style={styles.stack}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.copy}>{copy.message}</Text>
        <View style={styles.row}>
          <OutlinedActionButton
            accessibilityLabel={copy.actionLabel}
            label={copy.actionLabel}
            onPress={actions[copy.action]}
            variant="accent"
          />
          {copy.action === 'close' ? null : (
            <OutlinedActionButton
              accessibilityLabel="Cancel"
              label="Cancel"
              onPress={props.onClose}
            />
          )}
        </View>
      </View>
    );
  }

  if (state.step === 'saved') {
    return (
      <View style={styles.stack}>
        <Text style={styles.title}>Saved to Drive</Text>
        <Text style={styles.copy}>
          {state.sourceRemoved
            ? SOURCE_REMOVED_MESSAGE
            : 'Opening the Drive copy…'}
        </Text>
        {state.sourceRemoved ? (
          <OutlinedActionButton
            accessibilityLabel="Done"
            label="Done"
            onPress={props.onClose}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {state.mode === 'link' ? (
        <>
          <Text style={styles.title}>1. Open the link</Text>
          <Text style={styles.copy}>
            The site does not let the app read the file. Download it there, then
            come back. The app never downloads from these sites.
          </Text>
          <OutlinedActionButton
            icon="open-in-new"
            accessibilityLabel="Open the link"
            label="Open the link"
            onPress={props.onOpenLink}
            selected={state.hasOpenedLink}
          />
        </>
      ) : null}
      <Text style={styles.title}>
        {state.mode === 'link'
          ? '2. Choose the downloaded file'
          : 'Choose a file from this device'}
      </Text>
      <Text style={styles.copy}>
        PDF, MusicXML, or MIDI, up to 25 MB. It is only read to save it to your
        Drive.
      </Text>
      {state.refusal ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {DEVICE_FILE_REFUSAL_COPY[state.refusal]}
        </Text>
      ) : null}
      <OutlinedActionButton
        icon="folder-outline"
        accessibilityLabel="Choose file"
        label="Choose file"
        onPress={props.onChooseFile}
        variant="accent"
      />
      <OutlinedActionButton
        accessibilityLabel="Cancel"
        label="Cancel"
        onPress={props.onClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  copy: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
    lineHeight: 20,
  },
  error: {
    ...appTheme.type.body,
    color: appTheme.colors.danger,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  stack: {
    alignItems: 'flex-start',
    gap: appTheme.space.sm,
  },
  title: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
});
