import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { appTheme } from '../../../utils/theme';
import type { SourceAccessChip } from '../utils/drive-access-copy';

const ICON_SIZE = 12;
const CHIP_COLORS = {
  error: {
    edge: appTheme.colors.dangerEdge,
    fill: appTheme.colors.dangerFill,
    text: appTheme.colors.danger,
  },
  warning: {
    edge: appTheme.colors.warningEdge,
    fill: appTheme.colors.warningFill,
    text: appTheme.colors.warning,
  },
} as const;

// A one-line status for a file-level Drive problem (issue #40).
export const AccessChip = ({ chip }: { chip: SourceAccessChip }) => {
  const colors = CHIP_COLORS[chip.tone];

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: colors.fill, borderColor: colors.edge },
      ]}
    >
      <AppIcon color={colors.text} name={chip.icon} size={ICON_SIZE} />
      <Text numberOfLines={1} style={[styles.label, { color: colors.text }]}>
        {chip.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: appTheme.radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: appTheme.space.xs,
    marginRight: appTheme.space.sm,
    paddingHorizontal: appTheme.space.sm,
    paddingVertical: 2,
  },
  label: { fontSize: 11, fontWeight: '600' },
});
