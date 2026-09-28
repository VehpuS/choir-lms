import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { SectionHeading } from '../library/components/section-heading';
import { appTheme } from '../utils/theme';

type DestinationHeaderProps = {
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  title: string;
  trailingAction?: ReactNode;
};

export const DestinationHeader = ({
  style,
  subtitle,
  title,
  trailingAction,
}: DestinationHeaderProps) => {
  return (
    <View style={[styles.header, style]}>
      <SectionHeading
        body={subtitle}
        bodyStyle={styles.subtitle}
        style={styles.headerContent}
        title={title}
        titleNumberOfLines={1}
        titleStyle={styles.title}
        trailingAction={trailingAction}
      />
    </View>
  );
};

// One large title per destination, set directly on the ground (screens
// 1a, 1b, 1e): no card, fill, or shadow. zIndex keeps header popovers (the
// Drive session menu) above the content that follows.
const styles = StyleSheet.create({
  header: {
    overflow: 'visible',
    position: 'relative',
    zIndex: 20,
  },
  headerContent: {
    gap: appTheme.space.md,
    paddingVertical: appTheme.space.xs,
  },
  subtitle: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    ...appTheme.type.destinationTitle,
    color: appTheme.colors.text,
  },
});
