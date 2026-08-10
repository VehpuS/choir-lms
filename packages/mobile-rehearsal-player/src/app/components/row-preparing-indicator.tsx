import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../utils/theme';

type RowPreparingIndicatorProps = {
  label: string;
};

export const RowPreparingIndicator = ({ label }: RowPreparingIndicatorProps) => {
  return (
    <View
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      accessible
      style={styles.row}
    >
      <ActivityIndicator color={appTheme.colors.secondaryText} size="small" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '600',
  },
});
