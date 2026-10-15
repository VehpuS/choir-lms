import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { InteractionChip } from '../../components/interaction-chip';
import { buildPartChips, describePartNotices } from './model';
import type { ScoreInfo } from './sheet-music-surface-types';

type PartControlsProps = {
  info: ScoreInfo;
  onPressChip: (key: string) => void;
};

/** Which parts of a MusicXML or MIDI score are shown, with the vocal parts first. */
export const PartControls = ({ info, onPressChip }: PartControlsProps) => {
  const chips = buildPartChips(info.parts, info.resolved);
  const notices = describePartNotices(info.resolved.notices);

  return (
    <View style={styles.block}>
      <ScrollView
        accessibilityLabel="Parts"
        contentContainerStyle={styles.row}
        horizontal
        style={styles.scroller}
        showsHorizontalScrollIndicator={false}
      >
        {chips.map((chip) => (
          <InteractionChip
            accessibilityLabel={chip.accessibilityLabel}
            accessibilitySelected={chip.isOn}
            key={chip.key}
            label={chip.label}
            onPress={() => onPressChip(chip.key)}
            variant={chip.isOn ? 'selected' : 'passive'}
          />
        ))}
      </ScrollView>
      {notices.map((notice) => (
        <Text key={notice} style={styles.notice}>
          {notice}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // A horizontal ScrollView grows to fill a column; keep it to its chips' height.
  scroller: {
    flexGrow: 0,
  },
  block: {
    gap: appTheme.space.xs,
  },
  notice: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.textMuted,
  },
  row: {
    gap: appTheme.space.sm,
  },
});
