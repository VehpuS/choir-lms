import { Slider } from '@miblanchard/react-native-slider';
import { StyleSheet, Text, View } from 'react-native';

import { AccessibleSlider } from '../../../components/accessible-slider';
import {
  continuousInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import { CALIBRATION_ENTRY_LABEL } from './recording-calibration-model';
import {
  formatNudge,
  SHARED_DEVICE_KEY,
  SHARED_DEVICE_NOTE,
  SYNC_CONTROL_LABEL,
  SYNC_MAX_MS,
  SYNC_MIN_MS,
  SYNC_SAVE_LABEL,
  SYNC_SHEET_EXPLANATION,
  SYNC_SHEET_TITLE,
  SYNC_FINE_STEP_MS,
  SYNC_USE_FOR_DEVICE_LABEL,
} from './recording-sync-model';

const { colors, space, type } = appTheme;

const getSliderNumber = (value: number | number[]) =>
  Array.isArray(value) ? (value[0] ?? 0) : value;

type RecordingSyncSheetProps = {
  nudgeMs: number;
  onChange: (nudgeMs: number) => void;
  onClose: () => void;
  /** Opens the optional click calibration. */
  onMeasure: () => void;
  /** Keeps the compensation this nudge shows for the output in use. */
  onSave: () => void;
  canSave: boolean;
  /** What saving would store, described in words. */
  saveDetail: string;
  deviceKey: string;
};

/** The Sync sheet from the approved mock: a slider for the nudge and the device default. */
export const RecordingSyncSheet = ({
  canSave,
  deviceKey,
  nudgeMs,
  onChange,
  onClose,
  onMeasure,
  onSave,
  saveDetail,
}: RecordingSyncSheetProps) => (
  <BottomSheetSurface
    footer={
      <MenuGroup>
        <MenuRow label={CALIBRATION_ENTRY_LABEL} onPress={onMeasure} />
        <MenuRow label="Done" onPress={onClose} tone="preferred" />
      </MenuGroup>
    }
    isVisible={true}
    onClose={onClose}
    scrollable={true}
    title={SYNC_SHEET_TITLE}
  >
    <View style={styles.body}>
      <Text style={styles.detail}>{SYNC_SHEET_EXPLANATION}</Text>
      <Text style={styles.value}>{formatNudge(nudgeMs)}</Text>
      <View style={styles.row}>
        <Text style={styles.end}>{SYNC_MIN_MS}</Text>
        <View
          {...interactionGuardProps}
          style={[continuousInteractionGuardStyle, styles.slider]}
        >
          <AccessibleSlider
            label={SYNC_CONTROL_LABEL}
            maximum={SYNC_MAX_MS}
            minimum={SYNC_MIN_MS}
            onChange={onChange}
            step={SYNC_FINE_STEP_MS}
            value={nudgeMs}
            valueText={formatNudge(nudgeMs)}
          >
            <Slider
              maximumTrackTintColor={colors.divider}
              maximumValue={SYNC_MAX_MS}
              minimumTrackTintColor={colors.accent}
              minimumValue={SYNC_MIN_MS}
              onValueChange={(next) =>
                onChange(Math.round(getSliderNumber(next)))
              }
              step={SYNC_FINE_STEP_MS}
              thumbTintColor={colors.text}
              value={nudgeMs}
            />
          </AccessibleSlider>
        </View>
        <Text style={styles.end}>{`+${SYNC_MAX_MS}`}</Text>
      </View>
      <View style={styles.device}>
        <View style={styles.deviceText}>
          <Text style={styles.title}>{SYNC_USE_FOR_DEVICE_LABEL}</Text>
          <Text style={styles.detail}>{saveDetail}</Text>
          {deviceKey === SHARED_DEVICE_KEY ? (
            <Text style={styles.detail}>{SHARED_DEVICE_NOTE}</Text>
          ) : (
            <Text style={styles.detail}>{deviceKey}</Text>
          )}
        </View>
        <OutlinedActionButton
          disabled={!canSave}
          label={SYNC_SAVE_LABEL}
          onPress={onSave}
        />
      </View>
    </View>
  </BottomSheetSurface>
);

const styles = StyleSheet.create({
  body: { gap: space.md, paddingBottom: space.md },
  detail: { ...type.rowMeta, color: colors.textMuted },
  device: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: appTheme.radius.md,
    backgroundColor: colors.surface,
  },
  deviceText: { flex: 1, gap: space.xxs },
  end: { ...type.rowMeta, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  slider: { flex: 1 },
  title: { ...type.rowTitle, color: colors.text },
  value: { ...type.rowTitle, color: colors.text, textAlign: 'center' },
});
