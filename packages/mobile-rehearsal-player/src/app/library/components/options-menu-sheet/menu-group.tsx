import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { AppIcon, type AppIconName } from '../../../components/app-icon';
import { appTheme } from '../../../utils/theme';
import { interleaveExplorerRowSeparators } from '../explorer/model';
import { INTERACTION_STATE_OPACITY } from '../interaction-style-tokens';
import {
  MENU_ROW_MIN_HEIGHT,
  resolveMenuRowPalette,
  type MenuRowTone,
} from './menu-group-model';
import { ariaStateProps } from '../../../components/aria-state';

type MenuGroupProps = {
  children: ReactNode;
};

type MenuRowProps = {
  accessibilityLabel?: string;
  align?: 'center' | 'leading';
  disabled?: boolean;
  /** Leading decorative icon; the label stays the accessible name. */
  icon?: AppIconName;
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
  icon,
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
      {...ariaStateProps({ disabled })}
      {...interactionGuardProps}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isLeading ? styles.rowLeading : styles.rowCentered,
        // After the alignment rows so its centering wins on leading rows.
        icon ? styles.rowWithIcon : undefined,
        buttonInteractionGuardStyle,
        pressed && !disabled ? styles.rowPressed : undefined,
        disabled ? styles.rowDisabled : undefined,
      ]}
    >
      {icon ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.iconSlot}
        >
          <AppIcon color={palette.icon} name={icon} size={MENU_ROW_ICON_SIZE} />
        </View>
      ) : null}
      <MenuRowText hasIcon={Boolean(icon)}>
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
      </MenuRowText>
    </Pressable>
  );
};

const MENU_ROW_ICON_SIZE = 20;

// Beside an icon the label and meta stack in their own column; without one
// they stay direct children so the row's own centering and gap apply.
const MenuRowText = ({
  children,
  hasIcon,
}: {
  children: ReactNode;
  hasIcon: boolean;
}) => {
  return hasIcon ? (
    <View style={styles.textColumn}>{children}</View>
  ) : (
    <>{children}</>
  );
};

const styles = StyleSheet.create({
  group: {
    overflow: 'hidden',
    borderRadius: appTheme.radius.lg,
    backgroundColor: appTheme.colors.surface,
  },
  iconSlot: {
    width: MENU_ROW_ICON_SIZE,
    alignItems: 'center',
  },
  textColumn: {
    flex: 1,
    gap: 2,
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
  // An icon row reads left to right (icon, then label) like the iOS context
  // menu; icon-less rows keep the centered action-sheet look.
  rowWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: appTheme.space.md,
  },
  rowPressed: {
    backgroundColor: appTheme.colors.neutral[700],
  },
  separator: {
    height: 1,
    backgroundColor: appTheme.colors.hairline,
  },
});
