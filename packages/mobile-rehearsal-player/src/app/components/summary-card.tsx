import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../utils/theme';

type SummaryCardProps = {
  body: string;
  eyebrow: string;
  title: string;
};

export const SummaryCard = ({ body, eyebrow, title }: SummaryCardProps) => {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...appTheme.elevation.flat,
    gap: appTheme.space.xs,
    padding: appTheme.space.lg,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.surface,
  },
  eyebrow: {
    ...appTheme.type.kicker,
    color: appTheme.colors.textMuted,
  },
  cardTitle: {
    ...appTheme.type.sheetTitle,
    color: appTheme.colors.text,
  },
  cardBody: {
    ...appTheme.type.body,
    color: appTheme.colors.textSecondary,
    lineHeight: 20,
  },
});
