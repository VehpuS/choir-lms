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
    gap: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 20,
    backgroundColor: appTheme.colors.cardBackground,
  },
  eyebrow: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  cardBody: {
    color: appTheme.colors.secondaryText,
    fontSize: 15,
    lineHeight: 22,
  },
});
