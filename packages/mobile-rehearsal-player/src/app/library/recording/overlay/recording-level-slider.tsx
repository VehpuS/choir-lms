import { Slider } from '@miblanchard/react-native-slider';
import { StyleSheet, Text, View } from 'react-native';

import { AccessibleSlider } from '../../../components/accessible-slider';
import {
  continuousInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import {
  MIX_LABEL_WIDTH,
  MIX_LEFT_END_WIDTH,
  MIX_RIGHT_END_WIDTH,
} from './recording-mix-layout';
import {
  LEVEL_CONTROL_LABEL,
  LEVEL_HEADING,
  LEVEL_MAX_DB,
  LEVEL_MIN_DB,
  LEVEL_STEP_DB,
  describeLevel,
  formatLevelDb,
} from './recording-level-model';

const { colors, space, type } = appTheme;

const getSliderNumber = (value: number | number[]) =>
  Array.isArray(value) ? (value[0] ?? 0) : value;

type RecordingLevelSliderProps = {
  value: number;
  onChange: (levelDb: number) => void;
};

/** The `Level` slider: how loud the recording is, from quieter to louder, with the number beside it. */
export const RecordingLevelSlider = ({
  onChange,
  value,
}: RecordingLevelSliderProps) => (
  <View style={styles.row}>
    <Text style={styles.heading}>{LEVEL_HEADING}</Text>
    <View style={styles.leftEnd} />
    <View
      {...interactionGuardProps}
      style={[continuousInteractionGuardStyle, styles.slider]}
    >
      <AccessibleSlider
        label={LEVEL_CONTROL_LABEL}
        maximum={LEVEL_MAX_DB}
        minimum={LEVEL_MIN_DB}
        onChange={onChange}
        step={LEVEL_STEP_DB}
        value={value}
        valueText={describeLevel(value)}
      >
        <Slider
          maximumTrackTintColor={colors.divider}
          maximumValue={LEVEL_MAX_DB}
          minimumTrackTintColor={colors.accent}
          minimumValue={LEVEL_MIN_DB}
          onValueChange={(next) => onChange(getSliderNumber(next))}
          step={LEVEL_STEP_DB}
          thumbTintColor={colors.text}
          value={value}
        />
      </AccessibleSlider>
    </View>
    <Text style={styles.readout}>{formatLevelDb(value)}</Text>
  </View>
);

const styles = StyleSheet.create({
  heading: {
    ...type.rowMeta,
    color: colors.textMuted,
    width: MIX_LABEL_WIDTH,
  },
  leftEnd: { width: MIX_LEFT_END_WIDTH },
  readout: {
    ...type.rowMeta,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    width: MIX_RIGHT_END_WIDTH,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  slider: { flex: 1 },
});
