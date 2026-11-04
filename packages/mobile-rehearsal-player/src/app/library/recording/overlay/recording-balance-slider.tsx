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
  BALANCE_CONTROL_LABEL,
  BALANCE_HEADING,
  BALANCE_MAX_LABEL,
  BALANCE_MIN_LABEL,
  describeBalance,
} from './recording-mix-model';

const { colors, space, type } = appTheme;
const BALANCE_MIN = 0;
const BALANCE_MAX = 100;
const BALANCE_STEP = 1;

const getSliderNumber = (value: number | number[]) =>
  Array.isArray(value) ? (value[0] ?? 0) : value;

type RecordingBalanceSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

/** The Track … Mine slider: all track at one end, all recording at the other. */
export const RecordingBalanceSlider = ({
  onChange,
  value,
}: RecordingBalanceSliderProps) => (
  <View style={styles.row}>
    <Text style={styles.heading}>{BALANCE_HEADING}</Text>
    <Text style={styles.leftEnd}>{BALANCE_MIN_LABEL}</Text>
    <View
      {...interactionGuardProps}
      style={[continuousInteractionGuardStyle, styles.slider]}
    >
      <AccessibleSlider
        label={BALANCE_CONTROL_LABEL}
        maximum={BALANCE_MAX}
        minimum={BALANCE_MIN}
        onChange={onChange}
        step={BALANCE_STEP}
        value={value}
        valueText={describeBalance(value)}
      >
        <Slider
          maximumTrackTintColor={colors.divider}
          maximumValue={BALANCE_MAX}
          minimumTrackTintColor={colors.accent}
          minimumValue={BALANCE_MIN}
          onValueChange={(next) => onChange(Math.round(getSliderNumber(next)))}
          step={BALANCE_STEP}
          thumbTintColor={colors.text}
          value={value}
        />
      </AccessibleSlider>
    </View>
    <Text style={styles.rightEnd}>{BALANCE_MAX_LABEL}</Text>
  </View>
);

const styles = StyleSheet.create({
  heading: {
    ...type.rowMeta,
    color: colors.textMuted,
    width: MIX_LABEL_WIDTH,
  },
  leftEnd: {
    ...type.rowMeta,
    color: colors.textMuted,
    width: MIX_LEFT_END_WIDTH,
  },
  rightEnd: {
    ...type.rowMeta,
    color: colors.textMuted,
    textAlign: 'right',
    width: MIX_RIGHT_END_WIDTH,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  slider: { flex: 1 },
});
