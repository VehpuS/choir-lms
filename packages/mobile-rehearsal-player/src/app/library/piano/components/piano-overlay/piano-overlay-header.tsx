import { Slider } from '@miblanchard/react-native-slider';
import { Pressable, StyleSheet, View } from 'react-native';

import { AccessibleSlider } from '../../../../components/accessible-slider';
import { AppIcon } from '../../../../components/app-icon';
import {
  continuousInteractionGuardStyle,
  interactionGuardProps,
} from '../../../../components/interaction-guard';
import { appTheme } from '../../../../utils/theme';
import {
  MAX_WHITE_KEY_WIDTH,
  MIN_WHITE_KEY_WIDTH,
  type PianoHeightStep,
} from '../../keyboard-layout';
import { PIANO_HANDLE_HEIGHT, snapHeightStep } from '../../piano-overlay-model';
import { capturePointer, readPointer } from './pointer-events';
import { useRef } from 'react';

const { colors, radius, space } = appTheme;
const ICON_SIZE = 18;
const VOLUME_STEP = 0.05;
/** Key width moves in whole 4 pt steps (40 to 100 pt is 16 steps). */
const KEY_WIDTH_STEP = 4;
const PERCENT = 100;
/** Both sliders share the row with the grabber and close; sized for a 320 pt phone. */
const VOLUME_WIDTH = 104;
const GRABBER_WIDTH = 36;
const GRABBER_HEIGHT = 4;
/** A drag shorter than this is a tap, which does nothing. */
const HEIGHT_STEP_ORDER: readonly PianoHeightStep[] = [
  'compact',
  'regular',
  'tall',
];

const getSliderNumber = (value: number | number[]) => {
  return Array.isArray(value) ? (value[0] ?? 0) : value;
};

type PianoOverlayHeaderProps = {
  heightStep: PianoHeightStep;
  keyWidth: number;
  onChangeHeightStep: (step: PianoHeightStep) => void;
  onChangeKeyWidth: (width: number) => void;
  onChangeVolume: (volume: number) => void;
  onClose: () => void;
  volume: number;
};

/** The handle row: volume, the draggable grabber, and close. */
export const PianoOverlayHeader = ({
  heightStep,
  keyWidth,
  onChangeHeightStep,
  onChangeKeyWidth,
  onChangeVolume,
  onClose,
  volume,
}: PianoOverlayHeaderProps) => {
  const dragStartY = useRef<number | null>(null);

  const stepBy = (direction: 1 | -1) => {
    const index = HEIGHT_STEP_ORDER.indexOf(heightStep) + direction;
    const next = HEIGHT_STEP_ORDER[index];

    if (next) {
      onChangeHeightStep(next);
    }
  };

  const webProps = {
    onPointerDown: (event: unknown) => {
      capturePointer(event);
      dragStartY.current = readPointer(event).clientY;
    },
    onPointerUp: (event: unknown) => {
      if (dragStartY.current === null) {
        return;
      }

      const drag = readPointer(event).clientY - dragStartY.current;

      dragStartY.current = null;
      onChangeHeightStep(snapHeightStep(heightStep, drag));
    },
    onPointerCancel: () => {
      dragStartY.current = null;
    },
  };

  return (
    <View style={styles.header}>
      <View
        {...interactionGuardProps}
        style={[continuousInteractionGuardStyle, styles.volume]}
      >
        <AppIcon
          color={colors.textMuted}
          name={volume <= 0 ? 'volume-off' : 'volume-low'}
          size={ICON_SIZE}
        />
        <View style={styles.volumeSlider}>
          <AccessibleSlider
            label="Piano volume"
            maximum={1}
            minimum={0}
            onChange={onChangeVolume}
            step={VOLUME_STEP}
            value={volume}
            valueText={`${Math.round(volume * PERCENT)}%`}
          >
            <Slider
              containerStyle={styles.sliderContainer}
              maximumTrackTintColor={colors.divider}
              maximumValue={1}
              minimumTrackTintColor={colors.accent}
              minimumValue={0}
              onValueChange={(next) => {
                onChangeVolume(getSliderNumber(next));
              }}
              thumbTintColor={colors.text}
              value={volume}
            />
          </AccessibleSlider>
        </View>
      </View>
      <View
        {...interactionGuardProps}
        style={[continuousInteractionGuardStyle, styles.keyWidth]}
      >
        <AppIcon color={colors.textMuted} name="zoom-in" size={ICON_SIZE} />
        <View style={styles.volumeSlider}>
          <AccessibleSlider
            label="Key width"
            maximum={MAX_WHITE_KEY_WIDTH}
            minimum={MIN_WHITE_KEY_WIDTH}
            onChange={onChangeKeyWidth}
            step={KEY_WIDTH_STEP}
            value={keyWidth}
            valueText={`${Math.round(keyWidth)} points`}
          >
            <Slider
              containerStyle={styles.sliderContainer}
              maximumTrackTintColor={colors.divider}
              maximumValue={MAX_WHITE_KEY_WIDTH}
              minimumTrackTintColor={colors.accent}
              minimumValue={MIN_WHITE_KEY_WIDTH}
              onValueChange={(next) => {
                onChangeKeyWidth(getSliderNumber(next));
              }}
              step={KEY_WIDTH_STEP}
              thumbTintColor={colors.text}
              value={keyWidth}
            />
          </AccessibleSlider>
        </View>
      </View>
      <View
        {...webProps}
        accessibilityActions={[
          { label: 'Taller', name: 'increment' },
          { label: 'Shorter', name: 'decrement' },
        ]}
        accessibilityLabel="Piano height"
        accessibilityRole="adjustable"
        accessibilityValue={{ text: heightStep }}
        onAccessibilityAction={(event) => {
          stepBy(event.nativeEvent.actionName === 'increment' ? 1 : -1);
        }}
        style={styles.grabberArea}
        testID="piano-handle"
      >
        <View style={styles.grabber} />
      </View>
      <Pressable
        accessibilityLabel="Close piano"
        accessibilityRole="button"
        onPress={onClose}
        style={styles.button}
      >
        <AppIcon color={colors.icon} name="close" size={ICON_SIZE} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: PIANO_HANDLE_HEIGHT,
    paddingLeft: space.md,
  },
  volume: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
    width: VOLUME_WIDTH,
  },
  keyWidth: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
    marginLeft: space.sm,
    width: VOLUME_WIDTH,
  },
  volumeSlider: { flex: 1 },
  // The library's default is 40 pt tall; the touch target is 44 pt.
  sliderContainer: { height: appTheme.space.touchTarget },
  grabberArea: {
    alignItems: 'center',
    flex: 1,
    height: PIANO_HANDLE_HEIGHT,
    justifyContent: 'center',
    touchAction: 'none',
    userSelect: 'none',
  } as never,
  grabber: {
    backgroundColor: colors.divider,
    borderRadius: radius.pill,
    height: GRABBER_HEIGHT,
    width: GRABBER_WIDTH,
  },
  button: {
    alignItems: 'center',
    height: PIANO_HANDLE_HEIGHT,
    justifyContent: 'center',
    width: appTheme.space.touchTarget,
  },
});
