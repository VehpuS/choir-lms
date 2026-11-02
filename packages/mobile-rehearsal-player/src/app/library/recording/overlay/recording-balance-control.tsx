import { Slider } from '@miblanchard/react-native-slider';
import { StyleSheet, Text, View } from 'react-native';

import { AccessibleSlider } from '../../../components/accessible-slider';
import {
  continuousInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import { getRecordingsStore } from '../recordings-store-instance';
import {
  BALANCE_CONTROL_LABEL,
  BALANCE_MAX_LABEL,
  BALANCE_MIN_LABEL,
  describeBalance,
} from './recording-mix-model';
import {
  setRecordingMixBalance,
  useRecordingMixState,
} from './recording-mix-store';

const { colors, space, type } = appTheme;
const BALANCE_MIN = 0;
const BALANCE_MAX = 100;
const BALANCE_STEP = 1;

const getSliderNumber = (value: number | number[]) =>
  Array.isArray(value) ? (value[0] ?? 0) : value;

/**
 * Balance between the track and the recording that is playing: all track at
 * one end, all recording at the other, even in the middle. It changes the
 * sound as it moves and is saved with the recording when released.
 */
export const RecordingBalanceControl = () => {
  const { balance, recordingId } = useRecordingMixState();

  if (recordingId === null) {
    return null;
  }

  const save = (value: number | number[]) => {
    void getRecordingsStore()
      .update(recordingId, { balance: Math.round(getSliderNumber(value)) })
      .catch(() => undefined);
  };

  return (
    <View style={styles.row}>
      <Text style={styles.end}>{BALANCE_MIN_LABEL}</Text>
      <View
        {...interactionGuardProps}
        style={[continuousInteractionGuardStyle, styles.slider]}
      >
        <AccessibleSlider
          label={BALANCE_CONTROL_LABEL}
          maximum={BALANCE_MAX}
          minimum={BALANCE_MIN}
          onChange={(next) => {
            setRecordingMixBalance(next);
            save(next);
          }}
          step={BALANCE_STEP}
          value={balance}
          valueText={describeBalance(balance)}
        >
          <Slider
            maximumTrackTintColor={colors.divider}
            maximumValue={BALANCE_MAX}
            minimumTrackTintColor={colors.accent}
            minimumValue={BALANCE_MIN}
            onSlidingComplete={save}
            onValueChange={(next) =>
              setRecordingMixBalance(getSliderNumber(next))
            }
            step={BALANCE_STEP}
            thumbTintColor={colors.text}
            value={balance}
          />
        </AccessibleSlider>
      </View>
      <Text style={styles.end}>{BALANCE_MAX_LABEL}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  end: { ...type.rowMeta, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  slider: { flex: 1 },
});
