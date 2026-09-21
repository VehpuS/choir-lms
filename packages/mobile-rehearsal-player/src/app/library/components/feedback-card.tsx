import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  resolveFeedbackCardPalette,
  type FeedbackCardTone,
} from './feedback-card-model';

type FeedbackCardProps = {
  footer?: ReactNode;
  /**
   * Optional content rendered before the title, on the same row (e.g. an
   * activity indicator for an in-progress state).
   */
  leading?: ReactNode;
  message: string;
  messageStyle?: StyleProp<TextStyle>;
  size?: 'compact' | 'regular';
  style?: StyleProp<ViewStyle>;
  title: string;
  titleStyle?: StyleProp<TextStyle>;
  tone?: FeedbackCardTone;
};

export const FeedbackCard = ({
  footer,
  leading,
  message,
  messageStyle,
  size = 'regular',
  style,
  title,
  titleStyle,
  tone = 'neutral',
}: FeedbackCardProps) => {
  const palette = resolveFeedbackCardPalette(tone);
  const isCompact = size === 'compact';

  return (
    <View
      style={[
        styles.card,
        isCompact ? styles.compactCard : styles.regularCard,
        {
          backgroundColor: palette.surface,
          borderColor: palette.title,
          borderWidth: 1,
        },
        style,
      ]}
    >
      <View style={styles.titleRow}>
        {leading}
        <Text
          style={[
            isCompact ? styles.compactTitle : styles.regularTitle,
            {
              color: palette.title,
            },
            titleStyle,
          ]}
        >
          {title}
        </Text>
      </View>
      <Text
        style={[
          isCompact ? styles.compactMessage : styles.regularMessage,
          {
            color: palette.message,
          },
          messageStyle,
        ]}
      >
        {message}
      </Text>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
  },
  regularCard: {
    gap: 8,
    padding: 16,
  },
  compactCard: {
    gap: 6,
    padding: 14,
  },
  regularTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  regularMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  compactMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    marginTop: 2,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
