import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { hasSectionHeadingContent } from './section-heading-model';

type SectionHeadingProps = {
  body?: string;
  bodyStyle?: StyleProp<TextStyle>;
  eyebrow?: string;
  eyebrowStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  title?: string;
  titleNumberOfLines?: number;
  titleStyle?: StyleProp<TextStyle>;
  trailingAction?: ReactNode;
};

const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_TEXT = '#5f5647';

export const SectionHeading = ({
  body,
  bodyStyle,
  eyebrow,
  eyebrowStyle,
  style,
  title,
  titleNumberOfLines,
  titleStyle,
  trailingAction,
}: SectionHeadingProps) => {
  if (!hasSectionHeadingContent({
    body,
    eyebrow,
    hasTrailingAction: Boolean(trailingAction),
    title,
  })) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.copyGroup}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, eyebrowStyle]}>{eyebrow}</Text>
        ) : null}
        {title ? (
          <Text numberOfLines={titleNumberOfLines} style={[styles.title, titleStyle]}>
            {title}
          </Text>
        ) : null}
        {body ? <Text style={[styles.body, bodyStyle]}>{body}</Text> : null}
      </View>
      {trailingAction ? <View style={styles.trailingAction}>{trailingAction}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  copyGroup: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    color: SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: PRIMARY_TEXT,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  body: {
    color: SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  trailingAction: {
    alignSelf: 'flex-start',
  },
});