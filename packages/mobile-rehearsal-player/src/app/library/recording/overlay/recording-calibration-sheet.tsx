import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import {
  CALIBRATION_CANCEL_LABEL,
  CALIBRATION_DONE_LABEL,
  CALIBRATION_INTRO,
  CALIBRATION_MANUAL_LABEL,
  CALIBRATION_PLAY_LABEL,
  CALIBRATION_RETRY_LABEL,
  CALIBRATION_RUNNING,
  CALIBRATION_TITLE,
  describeMeasured,
  type CalibrationPhase,
} from './recording-calibration-model';

const { colors, space, type } = appTheme;

type RecordingCalibrationSheetProps = {
  phase: CalibrationPhase;
  deviceKey: string;
  onPlay: () => void;
  onCancel: () => void;
  /** Leaves the sheet; `Adjust by hand` returns to the Sync sheet. */
  onClose: () => void;
  onAdjustByHand: () => void;
};

const getBody = (phase: CalibrationPhase, deviceKey: string) => {
  switch (phase.kind) {
    case 'intro':
      return CALIBRATION_INTRO;
    case 'running':
      return CALIBRATION_RUNNING;
    case 'ok':
      return describeMeasured(phase.latencyMs, deviceKey);
    case 'failed':
      return phase.message;
  }
};

/** The calibration sheet from the approved mock: intro, running, measured, and failed. */
export const RecordingCalibrationSheet = ({
  deviceKey,
  onAdjustByHand,
  onCancel,
  onClose,
  onPlay,
  phase,
}: RecordingCalibrationSheetProps) => (
  <BottomSheetSurface
    footer={
      <MenuGroup>
        {phase.kind === 'running' ? (
          <MenuRow label={CALIBRATION_CANCEL_LABEL} onPress={onCancel} />
        ) : null}
        {phase.kind === 'ok' ? (
          <MenuRow
            label={CALIBRATION_DONE_LABEL}
            onPress={onClose}
            tone="preferred"
          />
        ) : null}
        {phase.kind === 'intro' || phase.kind === 'failed' ? (
          <>
            <MenuRow
              label={CALIBRATION_MANUAL_LABEL}
              onPress={onAdjustByHand}
            />
            <MenuRow
              label={
                phase.kind === 'failed'
                  ? CALIBRATION_RETRY_LABEL
                  : CALIBRATION_PLAY_LABEL
              }
              onPress={onPlay}
              tone="preferred"
            />
          </>
        ) : null}
      </MenuGroup>
    }
    isVisible={true}
    onClose={phase.kind === 'running' ? onCancel : onClose}
    scrollable={true}
    title={CALIBRATION_TITLE}
  >
    <View style={styles.body}>
      <Text style={[styles.text, phase.kind === 'failed' ? styles.bad : null]}>
        {getBody(phase, deviceKey)}
      </Text>
    </View>
  </BottomSheetSurface>
);

const styles = StyleSheet.create({
  bad: { color: colors.text },
  body: { gap: space.md, paddingBottom: space.md },
  text: { ...type.rowMeta, color: colors.textMuted },
});
