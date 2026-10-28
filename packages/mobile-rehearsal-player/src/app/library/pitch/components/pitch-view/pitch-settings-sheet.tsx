import { StyleSheet, Text } from 'react-native';

import { appTheme } from '../../../../utils/theme';
import { BottomSheetSurface } from '../../../components/bottom-sheet-surface';
import { PitchLevelMeter } from './pitch-level-meter';

type PitchSettingsSheetProps = {
  cutoffDb: number;
  isListening: boolean;
  onChangeCutoffDb: (cutoffDb: number) => void;
  onClose: () => void;
};

const { colors, space } = appTheme;

/** Minimum volume, edited from the Pitch view (design Decision 15). */
export const PitchSettingsSheet = ({
  cutoffDb,
  isListening,
  onChangeCutoffDb,
  onClose,
}: PitchSettingsSheetProps) => (
  <BottomSheetSurface
    eyebrow="Pitch"
    isVisible
    onClose={onClose}
    title="Pitch settings"
  >
    <PitchLevelMeter
      cutoffDb={cutoffDb}
      isListening={isListening}
      onChangeCutoffDb={onChangeCutoffDb}
    />
    <Text style={styles.note}>
      Pitch detection assumes headphones. Nothing you sing is recorded or sent
      anywhere.
    </Text>
  </BottomSheetSurface>
);

const styles = StyleSheet.create({
  note: { color: colors.textMuted, fontSize: 12, marginTop: space.sm },
});
