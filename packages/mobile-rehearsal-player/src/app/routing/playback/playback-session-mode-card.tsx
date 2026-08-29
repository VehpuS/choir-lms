import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../components/interaction-guard';
import { appTheme } from '../../utils/theme';
import { resolveRepeatToggleModel } from './playback-session-mode-options';

const getQueueToggleAction = (
  mode: RehearsalQueueMode,
): {
  accessibilityLabel: string;
  nextMode: RehearsalQueueMode;
  selected: boolean;
} => {
  if (mode === 'shuffle') {
    return {
      accessibilityLabel: 'Disable shuffle playback',
      nextMode: 'ordered',
      selected: true,
    };
  }

  return {
    accessibilityLabel: 'Enable shuffle playback',
    nextMode: 'shuffle',
    selected: false,
  };
};

const ModeButton = (props: {
  accessibilityHint?: string;
  accessibilityLabel: string;
  disabled?: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  selected: boolean;
}) => {
  return (
    <Pressable
      accessibilityHint={props.accessibilityHint}
      accessibilityLabel={props.accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        disabled: props.disabled,
        selected: props.selected,
      }}
      {...interactionGuardProps}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        props.selected ? styles.modeButtonSelected : styles.modeButton,
        buttonInteractionGuardStyle,
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
  const queueToggleAction = getQueueToggleAction(props.queueMode);
  const repeatModes = props.repeatModes ?? ['off', 'one', 'all'];
  const repeatToggle = resolveRepeatToggleModel(props.repeatMode, repeatModes);

  return (
    <View style={styles.card}>
      {showQueueModeControls ? (
        <View style={styles.groupRow}>
          <ModeButton
            accessibilityLabel={queueToggleAction.accessibilityLabel}
            disabled={props.isDisabled}
            icon="shuffle"
            onPress={() => {
              props.onSelectQueueMode(queueToggleAction.nextMode);
            }}
            selected={queueToggleAction.selected}
          />
        </View>
      ) : null}

      {showQueueModeControls ? <View style={styles.divider} /> : null}

      <View style={styles.groupRow}>
        <ModeButton
          accessibilityHint={repeatToggle.accessibilityHint}
          accessibilityLabel={repeatToggle.accessibilityLabel}
          disabled={props.isDisabled}
          icon={repeatToggle.icon}
          onPress={() => {
            props.onSelectRepeatMode(repeatToggle.nextMode);
          }}
          selected={repeatToggle.selected}
        />
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
