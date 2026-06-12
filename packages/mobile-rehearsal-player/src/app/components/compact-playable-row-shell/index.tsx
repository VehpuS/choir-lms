import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  getCompactPlayableRowShellLayout,
  type CompactPlayableRowShellVariant,
} from './model';

type CompactPlayableRowShellProps = {
  actions?: ReactNode;
  badge?: ReactNode;
  metadata?: ReactNode;
  message?: ReactNode;
  overflowTrigger?: ReactNode;
  style?: StyleProp<ViewStyle>;
  title: ReactNode;
  variant: CompactPlayableRowShellVariant;
};

export const CompactPlayableRowShell = ({
  actions,
  badge,
  metadata,
  message,
  overflowTrigger,
  style,
  title,
  variant,
}: CompactPlayableRowShellProps) => {
  const hasOverflowTrigger =
    overflowTrigger !== null && overflowTrigger !== undefined;
  const layout = getCompactPlayableRowShellLayout({
    hasOverflowTrigger,
    variant,
  });

  if (variant === 'row') {
    return (
      <View style={[styles.rowContainer, style]}>
        <View style={styles.rowCopy}>
          {title}
          {metadata}
          {message}
        </View>
        {actions || hasOverflowTrigger ? (
          <View style={styles.rowActions}>
            {actions}
            {layout.overflowPlacement === 'trailing-actions'
              ? overflowTrigger
              : null}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.cardContainer, style]}>
      {layout.overflowPlacement === 'top-right' ? overflowTrigger : null}
      <View style={styles.cardCopy}>
        <View style={{ paddingRight: layout.titleTrailingPadding }}>{title}</View>
        {badge || actions ? (
          <View style={styles.cardActions}>
            {badge}
            {actions}
          </View>
        ) : null}
      </View>
      {metadata}
      {message}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    position: 'relative',
    gap: 8,
  },
  cardCopy: {
    gap: 12,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});