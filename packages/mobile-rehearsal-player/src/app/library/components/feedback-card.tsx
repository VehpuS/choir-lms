import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { appTheme } from '../../utils/theme';
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
          borderColor: palette.edge,
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
    borderRadius: appTheme.radius.md,
  },
  regularCard: {
    gap: appTheme.space.xs,
    paddingHorizontal: appTheme.space.md,
    paddingVertical: appTheme.space.md,
  },
  compactCard: {
    gap: appTheme.space.xxs,
    paddingHorizontal: appTheme.space.md,
    paddingVertical: appTheme.space.sm,
  },
  regularTitle: {
    ...appTheme.type.rowTitle,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: appTheme.fontWeight.medium,
    lineHeight: 20,
  },
  regularMessage: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  compactMessage: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  footer: {
    marginTop: appTheme.space.xxs,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
});
