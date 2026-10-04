import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import {
  PITCH_HELPER,
  PITCH_STEP_SEMITONES,
  getPitchControlModel,
  stepPitchSemitones,
} from './shaping-surface-model';
import { shapingStyles as styles } from './styles';

const STEP_ICON_SIZE = 22;

type PitchControlProps = {
  canShapePitch: boolean;
  onSetPitchSemitones: (semitones: number) => void;
  pitchSemitones: number;
};

type StepButtonProps = {
  accessibilityLabel: string;
  disabled: boolean;
  icon: 'minus' | 'plus';
  onPress: () => void;
};

const StepButton = ({
  accessibilityLabel,
  disabled,
  icon,
  onPress,
}: StepButtonProps) => {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...interactionGuardProps}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
        buttonInteractionGuardStyle,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <AppIcon color={appTheme.colors.icon} name={icon} size={STEP_ICON_SIZE} />
    </Pressable>
  );
};

/**
 * The semitone stepper. Where pitch cannot be shifted it keeps its layout but
 * has no handlers and says why, instead of applying a change nobody can hear.
 */
export const PitchControl = ({
  canShapePitch,
  onSetPitchSemitones,
  pitchSemitones,
}: PitchControlProps) => {
  const model = getPitchControlModel({ canShapePitch, pitchSemitones });
  // Taps step from the latest value, not from the last render's prop, so two
  // quick taps are two steps even if the second lands before a re-render.
  const latestPitchRef = useRef(pitchSemitones);

  useEffect(() => {
    latestPitchRef.current = pitchSemitones;
  }, [pitchSemitones]);

  const step = (delta: number) => {
    const next = stepPitchSemitones(latestPitchRef.current, delta);

    latestPitchRef.current = next;
    onSetPitchSemitones(next);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.kicker}>Pitch</Text>
        <Text
          accessibilityLabel={`Pitch ${model.readout}`}
          style={[styles.readout, model.isShaped ? null : styles.readoutIdle]}
        >
          {model.readout}
        </Text>
      </View>
      <View style={styles.stepperRow}>
        <StepButton
          accessibilityLabel={model.decreaseLabel}
          disabled={!model.canStepDown}
          icon="minus"
          onPress={() => step(-PITCH_STEP_SEMITONES)}
        />
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.strip}
        >
          {model.bars.map((bar) => (
            <View
              key={bar.position}
              style={[
                styles.stripBar,
                bar.kind === 'zero' ? styles.stripBarZero : null,
                bar.kind === 'filled' ? styles.stripBarFilled : null,
              ]}
            />
          ))}
        </View>
        <StepButton
          accessibilityLabel={model.increaseLabel}
          disabled={!model.canStepUp}
          icon="plus"
          onPress={() => step(PITCH_STEP_SEMITONES)}
        />
      </View>
      <Text style={styles.helper}>{PITCH_HELPER}</Text>
      {model.unavailableReason ? (
        <Text style={styles.inertReason}>{model.unavailableReason}</Text>
      ) : null}
    </View>
  );
};
