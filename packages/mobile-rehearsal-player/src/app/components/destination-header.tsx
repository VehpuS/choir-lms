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

const styles = StyleSheet.create({
  header: {
    borderRadius: 22,
    backgroundColor: appTheme.colors.heroBackground,
    overflow: 'visible',
    position: 'relative',
    zIndex: 20,
    shadowColor: '#173229',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  headerContent: {
    gap: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },
  subtitle: {
    color: 'rgba(255, 248, 239, 0.72)',
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: '#fff8ef',
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  },
});
