import { StyleSheet, Text, View } from 'react-native';
import type { Sensitivity } from '@org/pitch-detection';

import { SegmentedControl } from '../../../../components/segmented-control';
import { appTheme } from '../../../../utils/theme';
import { BottomSheetSurface } from '../../../components/bottom-sheet-surface';
import { SENSITIVITIES, SENSITIVITY_LABELS } from '../../view/pitch-view-model';

type PitchSettingsSheetProps = {
  sensitivity: Sensitivity;
  onSelectSensitivity: (sensitivity: Sensitivity) => void;
  onClose: () => void;
};

const { colors, space } = appTheme;
const SENSITIVITY_OPTIONS = SENSITIVITIES.map((value) => ({
  value,
  label: SENSITIVITY_LABELS[value],
}));

/** Sensitivity, edited from the Pitch view (design Decision 15). */
export const PitchSettingsSheet = ({
  sensitivity,
  onSelectSensitivity,
  onClose,
}: PitchSettingsSheetProps) => (
  <BottomSheetSurface
    eyebrow="Pitch"
    isVisible
    onClose={onClose}
    title="Pitch settings"
  >
    <View style={styles.option}>
      <Text style={styles.optionLabel}>Sensitivity</Text>
      <SegmentedControl
        accessibilityLabel="Sensitivity"
        onSelect={onSelectSensitivity}
        options={SENSITIVITY_OPTIONS}
        selectedValue={sensitivity}
      />
    </View>
    <Text style={styles.note}>
      Pitch detection assumes headphones. Nothing you sing is recorded or sent
      anywhere.
    </Text>
  </BottomSheetSurface>
);

const styles = StyleSheet.create({
  option: { gap: space.xs },
  optionLabel: { color: colors.text, fontSize: 14 },
  note: { color: colors.textMuted, fontSize: 12 },
});
