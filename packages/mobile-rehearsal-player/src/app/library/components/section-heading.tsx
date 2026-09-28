import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { hasSectionHeadingContent } from './section-heading-model';

import { appTheme } from '../../utils/theme';

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

const PRIMARY_TEXT = appTheme.colors.text;
const SECONDARY_TEXT = appTheme.colors.textMuted;

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
  if (
    !hasSectionHeadingContent({
      body,
      eyebrow,
      hasTrailingAction: Boolean(trailingAction),
      title,
    })
  ) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.copyGroup}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, eyebrowStyle]}>{eyebrow}</Text>
        ) : null}
        {title ? (
          <Text
            numberOfLines={titleNumberOfLines}
            style={[styles.title, titleStyle]}
          >
            {title}
          </Text>
        ) : null}
        {body ? <Text style={[styles.body, bodyStyle]}>{body}</Text> : null}
      </View>
      {trailingAction ? (
        <View style={styles.trailingAction}>{trailingAction}</View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: appTheme.space.sm,
  },
  copyGroup: {
    flex: 1,
    minWidth: 0,
    gap: appTheme.space.xxs,
  },
  eyebrow: {
    ...appTheme.type.kicker,
    color: SECONDARY_TEXT,
  },
  title: {
    color: PRIMARY_TEXT,
    fontSize: 17,
    fontWeight: appTheme.fontWeight.medium,
    lineHeight: 22,
  },
  body: {
    ...appTheme.type.body,
    color: SECONDARY_TEXT,
    lineHeight: 20,
  },
  trailingAction: {
    alignSelf: 'flex-start',
  },
});
