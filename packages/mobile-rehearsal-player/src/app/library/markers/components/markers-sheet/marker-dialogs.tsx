import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { appTheme } from '../../../../utils/theme';
import { CenteredDialogCard } from '../../../components/centered-dialog-card';
import {
  MARKER_NUDGE_STEPS,
  MARKER_TIME_FORMAT_HINT,
  MAX_MARKER_NAME_LENGTH,
  nudgeMarkerPosition,
  parseMarkerTimeInput,
  validateMarkerNameInput,
} from './edit-model';
import { formatMarkerTime } from './model';

type RenameMarkerDialogProps = {
  initialName: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
};

export const RenameMarkerDialog = ({
  initialName,
  onCancel,
  onSubmit,
}: RenameMarkerDialogProps) => {
  const [text, setText] = useState(initialName);
  const validation = validateMarkerNameInput(text);
  const error = validation.isValid ? undefined : validation.error;

  const submit = () => {
    if (validation.isValid) {
      onSubmit(validation.name);
    }
  };

  return (
    <CenteredDialogCard isVisible onRequestClose={onCancel}>
      <Text style={styles.title}>Rename marker</Text>
      <TextInput
        accessibilityLabel="Marker name"
        autoCapitalize="sentences"
        autoCorrect={false}
        autoFocus
        maxLength={MAX_MARKER_NAME_LENGTH}
        onChangeText={setText}
        onSubmitEditing={submit}
        returnKeyType="done"
        selectTextOnFocus
        style={styles.input}
        value={text}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <OutlinedActionButton fill label="Cancel" onPress={onCancel} />
        <OutlinedActionButton
          disabled={!validation.isValid}
          fill
          label="Save"
          onPress={submit}
          variant="accent"
        />
      </View>
    </CenteredDialogCard>
  );
};

type MoveMarkerDialogProps = {
  /** Absent when the track is not the loaded item. */
  currentPositionMs?: number;
  durationMs?: number;
  initialPositionMs: number;
  name: string;
  onCancel: () => void;
  onSubmit: (positionMs: number) => void;
};

export const MoveMarkerDialog = ({
  currentPositionMs,
  durationMs,
  initialPositionMs,
  name,
  onCancel,
  onSubmit,
}: MoveMarkerDialogProps) => {
  const [positionMs, setPositionMs] = useState(initialPositionMs);
  const [text, setText] = useState(formatMarkerTime(initialPositionMs));
  const [error, setError] = useState<string | undefined>();

  const applyPosition = (nextMs: number) => {
    setPositionMs(nextMs);
    setText(formatMarkerTime(nextMs));
    setError(undefined);
  };

  // Typing only changes the draft once it reads as a valid time.
  const handleTextChange = (nextText: string) => {
    setText(nextText);

    const parsed = parseMarkerTimeInput(nextText, durationMs);

    if (parsed.isValid) {
      setPositionMs(parsed.positionMs);
      setError(undefined);
      return;
    }

    setError(parsed.error);
  };

  const hasChanged = positionMs !== initialPositionMs;

  return (
    <CenteredDialogCard isVisible onRequestClose={onCancel}>
      <Text style={styles.title}>Move marker</Text>
      <Text style={styles.body}>{name}</Text>
      <View style={styles.nudgeRow}>
        {MARKER_NUDGE_STEPS.map((step) => (
          <OutlinedActionButton
            accessibilityLabel={`Nudge ${step.label}`}
            fill
            key={step.label}
            label={step.label}
            onPress={() => {
              applyPosition(
                nudgeMarkerPosition(positionMs, step.deltaMs, durationMs),
              );
            }}
          />
        ))}
      </View>
      <TextInput
        accessibilityLabel={`Time, ${MARKER_TIME_FORMAT_HINT}`}
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        onChangeText={handleTextChange}
        placeholder={MARKER_TIME_FORMAT_HINT}
        placeholderTextColor={appTheme.colors.textFaint}
        style={styles.input}
        value={text}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {currentPositionMs === undefined ? null : (
        <OutlinedActionButton
          label="Set to current position"
          onPress={() => {
            applyPosition(Math.round(currentPositionMs));
          }}
        />
      )}
      <View style={styles.actions}>
        <OutlinedActionButton fill label="Cancel" onPress={onCancel} />
        <OutlinedActionButton
          disabled={error !== undefined || !hasChanged}
          fill
          label="Save"
          onPress={() => {
            onSubmit(positionMs);
          }}
          variant="accent"
        />
      </View>
    </CenteredDialogCard>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  body: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
  },
  error: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.danger,
  },
  input: {
    minHeight: appTheme.space.touchTarget,
    borderWidth: 1,
    borderColor: appTheme.colors.borderButton,
    borderRadius: appTheme.radius.md,
    paddingHorizontal: appTheme.space.sm,
    color: appTheme.colors.text,
    fontSize: appTheme.type.body.fontSize,
    backgroundColor: appTheme.colors.bg,
  },
  nudgeRow: {
    flexDirection: 'row',
    gap: appTheme.space.xxs,
  },
  title: {
    ...appTheme.type.sheetTitle,
    color: appTheme.colors.text,
  },
});
