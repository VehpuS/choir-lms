import {
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../utils/theme';

const QUEUE_MODE_OPTIONS: Array<{
  label: string;
  mode: RehearsalQueueMode;
}> = [
  {
    label: 'Ordered',
    mode: 'ordered',
  },
  {
    label: 'Shuffle',
    mode: 'shuffle',
  },
];

const REPEAT_MODE_OPTIONS: Array<{
  label: string;
  mode: RepeatMode;
}> = [
  {
    label: 'Off',
    mode: 'off',
  },
  {
    label: 'One',
    mode: 'one',
  },
  {
    label: 'All',
    mode: 'all',
  },
];

const ModeButton = (props: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
}) => {
  return (
    <Pressable
      accessibilityLabel={props.accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        disabled: props.disabled,
        selected: props.selected,
      }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        props.selected ? styles.modeButtonSelected : styles.modeButton,
        pressed && !props.disabled ? styles.modeButtonPressed : null,
        props.disabled ? styles.modeButtonDisabled : null,
      ]}
    >
      <Text
        style={
          props.selected
            ? styles.modeButtonSelectedLabel
            : styles.modeButtonLabel
        }
      >
        {props.label}
      </Text>
    </Pressable>
  );
};

export const PlaybackSessionModeCard = (props: {
  isDisabled?: boolean;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSelectRepeatMode: (mode: RepeatMode) => void;
  queueMode: RehearsalQueueMode;
  repeatMode: RepeatMode;
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.group}>
        <Text style={styles.title}>Queue mode</Text>
        <View style={styles.row}>
          {QUEUE_MODE_OPTIONS.map((option) => {
            return (
              <ModeButton
                accessibilityLabel={`${option.label} playback`}
                disabled={props.isDisabled}
                key={option.mode}
                label={option.label}
                onPress={() => {
                  props.onSelectQueueMode(option.mode);
                }}
                selected={props.queueMode === option.mode}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.title}>Repeat</Text>
        <View style={styles.row}>
          {REPEAT_MODE_OPTIONS.map((option) => {
            return (
              <ModeButton
                accessibilityLabel={`Repeat ${option.label}`}
                disabled={props.isDisabled}
                key={option.mode}
                label={option.label}
                onPress={() => {
                  props.onSelectRepeatMode(option.mode);
                }}
                selected={props.repeatMode === option.mode}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 18,
    backgroundColor: '#faf6ee',
  },
  group: {
    gap: 8,
  },
  title: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeButton: {
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  modeButtonSelected: {
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#305c4d',
  },
  modeButtonPressed: {
    opacity: 0.84,
  },
  modeButtonDisabled: {
    opacity: 0.5,
  },
  modeButtonLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  modeButtonSelectedLabel: {
    color: '#fff8ef',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
