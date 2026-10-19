import { Slider } from '@miblanchard/react-native-slider';
import { Pressable, StyleSheet, View } from 'react-native';

import { AccessibleSlider } from '../../../../components/accessible-slider';
import { AppIcon } from '../../../../components/app-icon';
import { ariaStateProps } from '../../../../components/aria-state';
import {
  continuousInteractionGuardStyle,
  interactionGuardProps,
} from '../../../../components/interaction-guard';
import { appTheme } from '../../../../utils/theme';
import type { PianoHeightStep } from '../../keyboard-layout';
import { PIANO_HANDLE_HEIGHT, snapHeightStep } from '../../piano-overlay-model';
import { capturePointer, readPointer } from './pointer-events';
import { useRef } from 'react';

const { colors, radius, space } = appTheme;
const ICON_SIZE = 18;
const VOLUME_STEP = 0.05;
const PERCENT = 100;
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
  isCollapsed: boolean;
  onChangeHeightStep: (step: PianoHeightStep) => void;
  onChangeVolume: (volume: number) => void;
  onClose: () => void;
  onToggleCollapsed: () => void;
  volume: number;
};

/** The handle row: volume, the draggable grabber, collapse, and close. */
export const PianoOverlayHeader = ({
  heightStep,
  isCollapsed,
  onChangeHeightStep,
  onChangeVolume,
  onClose,
  onToggleCollapsed,
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
        accessibilityLabel={isCollapsed ? 'Show keyboard' : 'Hide keyboard'}
        accessibilityRole="button"
        accessibilityState={{ expanded: !isCollapsed }}
        {...ariaStateProps({ expanded: !isCollapsed })}
        onPress={onToggleCollapsed}
        style={styles.button}
      >
        <AppIcon
          color={colors.icon}
          name={isCollapsed ? 'chevron-up' : 'chevron-down'}
          size={ICON_SIZE}
        />
      </Pressable>
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
    width: 132,
  },
  volumeSlider: { flex: 1 },
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
