import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import { Pressable, StyleSheet, View } from 'react-native';

import { appTheme } from '../utils/theme';

const QUEUE_MODE_OPTIONS: Array<{
  accessibilityLabel: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  mode: RehearsalQueueMode;
}> = [
  {
    accessibilityLabel: 'Play in saved order',
    icon: 'format-list-numbered',
    mode: 'ordered',
  },
  {
    accessibilityLabel: 'Shuffle playback',
    icon: 'shuffle',
    mode: 'shuffle',
  },
];

const REPEAT_MODE_OPTIONS: Array<{
  accessibilityLabel: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  mode: RepeatMode;
}> = [
  {
    accessibilityLabel: 'Repeat off',
    icon: 'repeat-off',
    mode: 'off',
  },
  {
    accessibilityLabel: 'Repeat one',
    icon: 'repeat-once',
    mode: 'one',
  },
  {
    accessibilityLabel: 'Repeat all',
    icon: 'repeat',
    mode: 'all',
  },
];

const ModeButton = (props: {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
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
      <MaterialCommunityIcons
        color={props.selected ? '#fff8ef' : appTheme.colors.primaryText}
        name={props.icon}
        size={22}
      />
    </Pressable>
  );
};

export const PlaybackSessionModeCard = (props: {
  isDisabled?: boolean;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSelectRepeatMode: (mode: RepeatMode) => void;
  queueMode: RehearsalQueueMode;
  repeatMode: RepeatMode;
  repeatModes?: RepeatMode[];
  showQueueModeControls?: boolean;
}) => {
  const showQueueModeControls = props.showQueueModeControls ?? true;
  const repeatModes = props.repeatModes ?? ['off', 'one', 'all'];
  const visibleRepeatOptions = REPEAT_MODE_OPTIONS.filter((option) =>
    repeatModes.includes(option.mode),
  );

  return (
    <View style={styles.card}>
      {showQueueModeControls ? (
        <View style={styles.groupRow}>
          {QUEUE_MODE_OPTIONS.map((option) => {
            return (
              <ModeButton
                accessibilityLabel={option.accessibilityLabel}
                disabled={props.isDisabled}
                icon={option.icon}
                key={option.mode}
                onPress={() => {
                  props.onSelectQueueMode(option.mode);
                }}
                selected={props.queueMode === option.mode}
              />
            );
          })}
        </View>
      ) : null}

      {showQueueModeControls ? <View style={styles.divider} /> : null}

      <View style={styles.groupRow}>
        {visibleRepeatOptions.map((option) => {
          return (
            <ModeButton
              accessibilityLabel={option.accessibilityLabel}
              disabled={props.isDisabled}
              icon={option.icon}
              key={option.mode}
              onPress={() => {
                props.onSelectRepeatMode(option.mode);
              }}
              selected={props.repeatMode === option.mode}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 18,
    backgroundColor: '#faf6ee',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: appTheme.colors.border,
  },
  modeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  modeButtonSelected: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#305c4d',
  },
  modeButtonPressed: {
    opacity: 0.84,
  },
  modeButtonDisabled: {
    opacity: 0.5,
  },
});
