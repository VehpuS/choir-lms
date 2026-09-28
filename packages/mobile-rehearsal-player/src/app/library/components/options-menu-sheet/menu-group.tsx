import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import { interleaveExplorerRowSeparators } from '../explorer/model';
import { INTERACTION_STATE_OPACITY } from '../interaction-style-tokens';
import {
  MENU_ROW_MIN_HEIGHT,
  resolveMenuRowPalette,
  type MenuRowTone,
} from './menu-group-model';

type MenuGroupProps = {
  children: ReactNode;
};

type MenuRowProps = {
  accessibilityLabel?: string;
  align?: 'center' | 'leading';
  disabled?: boolean;
  label: string;
  meta?: string;
  onPress: () => void;
  tone?: MenuRowTone;
};

/**
 * One rounded group of menu rows, divided by hairlines — the iOS action
 * sheet / inset-grouped list pattern every option menu in the app follows.
 */
export const MenuGroup = ({ children }: MenuGroupProps) => {
  const rows = interleaveExplorerRowSeparators(
    Children.toArray(children),
    (index) => {
      return <View key={`separator-${index}`} style={styles.separator} />;
    },
  );

  return <View style={styles.group}>{rows}</View>;
};

export const MenuRow = ({
  accessibilityLabel,
  align = 'center',
  disabled = false,
  label,
  meta,
  onPress,
  tone = 'default',
}: MenuRowProps) => {
  const palette = resolveMenuRowPalette(tone);
  const isLeading = align === 'leading';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...interactionGuardProps}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isLeading ? styles.rowLeading : styles.rowCentered,
        buttonInteractionGuardStyle,
        pressed && !disabled ? styles.rowPressed : undefined,
        disabled ? styles.rowDisabled : undefined,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          { color: palette.label, fontWeight: palette.fontWeight },
        ]}
      >
        {label}
      </Text>
      {meta ? (
        <Text numberOfLines={1} style={styles.meta}>
          {meta}
        </Text>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  group: {
    overflow: 'hidden',
    borderRadius: appTheme.radius.lg,
    backgroundColor: appTheme.colors.surface,
  },
  label: {
    fontSize: 16,
  },
  meta: {
    ...appTheme.type.rowMeta,
  },
  row: {
    minHeight: MENU_ROW_MIN_HEIGHT,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: appTheme.space.lg,
    paddingVertical: appTheme.space.xs,
  },
  rowCentered: {
    alignItems: 'center',
  },
  rowDisabled: {
    opacity: INTERACTION_STATE_OPACITY.disabled,
  },
  rowLeading: {
    alignItems: 'flex-start',
  },
  rowPressed: {
    backgroundColor: appTheme.colors.neutral[700],
  },
  separator: {
    height: 1,
    backgroundColor: appTheme.colors.hairline,
  },
});
