import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '../../../../components/app-icon';
import { appTheme } from '../../../../utils/theme';
import type { PianoHeightStep } from '../../keyboard-layout';
import { PIANO_HANDLE_HEIGHT, snapHeightStep } from '../../piano-overlay-model';
import { useRef } from 'react';
import { PianoKeyWidthControl, PianoVolumeControl } from './piano-bar-controls';
import { capturePointer, readPointer } from './pointer-events';

const { colors, radius, space } = appTheme;
const ICON_SIZE = 18;
const GRABBER_WIDTH = 36;
const GRABBER_HEIGHT = 4;
/** A drag shorter than this is a tap, which does nothing. */
const HEIGHT_STEP_ORDER: readonly PianoHeightStep[] = [
  'compact',
  'regular',
  'tall',
];

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
      <PianoVolumeControl onChange={onChangeVolume} volume={volume} />
      <PianoKeyWidthControl
        keyWidth={keyWidth}
        onChange={onChangeKeyWidth}
        style={styles.keyWidth}
      />
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
  keyWidth: { marginLeft: space.sm },
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
