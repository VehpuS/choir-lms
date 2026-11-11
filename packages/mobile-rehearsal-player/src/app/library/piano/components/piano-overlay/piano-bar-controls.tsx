import { Slider } from '@miblanchard/react-native-slider';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

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
} from '../../keyboard-layout';

const { colors, space } = appTheme;
const ICON_SIZE = 18;
const VOLUME_STEP = 0.05;
/** Key width moves in whole 4 pt steps (40 to 100 pt is 16 steps). */
const KEY_WIDTH_STEP = 4;
const PERCENT = 100;
/** Both sliders share the row with other controls; sized for a 320 pt phone. */
export const PIANO_CONTROL_WIDTH = 104;

const getSliderNumber = (value: number | number[]) => {
  return Array.isArray(value) ? (value[0] ?? 0) : value;
};

type PianoControlProps = {
  /** The slider's touch height; the docked row uses the 44 pt target. */
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** The piano's own volume: an icon and a slider, never the track's volume. */
export const PianoVolumeControl = ({
  height = appTheme.space.touchTarget,
  onChange,
  style,
  volume,
}: PianoControlProps & {
  onChange: (volume: number) => void;
  volume: number;
}) => (
  <View
    {...interactionGuardProps}
    style={[continuousInteractionGuardStyle, styles.control, style]}
  >
    <AppIcon
      color={colors.textMuted}
      name={volume <= 0 ? 'volume-off' : 'volume-low'}
      size={ICON_SIZE}
    />
    <View style={styles.slider}>
      <AccessibleSlider
        label="Piano volume"
        maximum={1}
        minimum={0}
        onChange={onChange}
        step={VOLUME_STEP}
        value={volume}
        valueText={`${Math.round(volume * PERCENT)}%`}
      >
        <Slider
          containerStyle={{ height }}
          maximumTrackTintColor={colors.divider}
          maximumValue={1}
          minimumTrackTintColor={colors.accent}
          minimumValue={0}
          onValueChange={(next) => {
            onChange(getSliderNumber(next));
          }}
          thumbTintColor={colors.text}
          value={volume}
        />
      </AccessibleSlider>
    </View>
  </View>
);

/** How wide the keys are: a zoom icon and a slider. */
export const PianoKeyWidthControl = ({
  height = appTheme.space.touchTarget,
  keyWidth,
  onChange,
  style,
}: PianoControlProps & {
  keyWidth: number;
  onChange: (width: number) => void;
}) => (
  <View
    {...interactionGuardProps}
    style={[continuousInteractionGuardStyle, styles.control, style]}
  >
    <AppIcon color={colors.textMuted} name="zoom-in" size={ICON_SIZE} />
    <View style={styles.slider}>
      <AccessibleSlider
        label="Key width"
        maximum={MAX_WHITE_KEY_WIDTH}
        minimum={MIN_WHITE_KEY_WIDTH}
        onChange={onChange}
        step={KEY_WIDTH_STEP}
        value={keyWidth}
        valueText={`${Math.round(keyWidth)} points`}
      >
        <Slider
          containerStyle={{ height }}
          maximumTrackTintColor={colors.divider}
          maximumValue={MAX_WHITE_KEY_WIDTH}
          minimumTrackTintColor={colors.accent}
          minimumValue={MIN_WHITE_KEY_WIDTH}
          onValueChange={(next) => {
            onChange(getSliderNumber(next));
          }}
          step={KEY_WIDTH_STEP}
          thumbTintColor={colors.text}
          value={keyWidth}
        />
      </AccessibleSlider>
    </View>
  </View>
);

const styles = StyleSheet.create({
  control: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
    width: PIANO_CONTROL_WIDTH,
  },
  slider: { flex: 1 },
});
