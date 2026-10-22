import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../../components/app-icon';
import { ariaStateProps } from '../../../../components/aria-state';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../../components/interaction-guard';
import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { appTheme } from '../../../../utils/theme';
import { INTERACTION_STATE_OPACITY } from '../../../components/interaction-style-tokens';
import type { MarkerRow as MarkerRowModel } from './model';

type MarkerRowProps = {
  isChecked: boolean;
  isSelecting: boolean;
  onOpenMenu: () => void;
  onPress: () => void;
  row: MarkerRowModel;
};

const CHECK_ICON_SIZE = 22;
const FLAG_ICON_SIZE = 18;

/** `Verse 2 start, 1:00.0` plus the reason a row cannot be jumped to. */
export const resolveMarkerRowLabel = (row: MarkerRowModel): string => {
  const base = `${row.name}, ${row.timeLabel}`;

  return row.pastEndMessage ? `${base}. ${row.pastEndMessage}` : base;
};

/** One marker: name and time, jump on tap, actions in the trailing menu. */
export const MarkerRow = ({
  isChecked,
  isSelecting,
  onOpenMenu,
  onPress,
  row,
}: MarkerRowProps) => {
  const isDerived = row.origin !== 'explicit';
  // Past-end rows stay interactive for editing; only jumping is withheld, and
  // in Select mode they are still not choosable as loop boundaries.
  const isPressDisabled = isSelecting ? row.isPastEnd : !row.canJump;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={resolveMarkerRowLabel(row)}
        accessibilityRole={isSelecting ? 'checkbox' : 'button'}
        accessibilityState={{
          checked: isSelecting ? isChecked : undefined,
          disabled: isPressDisabled,
        }}
        {...ariaStateProps(
          { checked: isSelecting ? isChecked : undefined },
          isSelecting ? 'checkbox' : 'button',
        )}
        {...interactionGuardProps}
        disabled={isPressDisabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.main,
          buttonInteractionGuardStyle,
          pressed && !isPressDisabled ? styles.pressed : undefined,
          row.isPastEnd ? styles.dimmed : undefined,
        ]}
      >
        {isSelecting ? (
          <AppIcon
            color={
              isChecked ? appTheme.colors.accent : appTheme.colors.textMuted
            }
            name={isChecked ? 'check-circle' : 'circle-outline'}
            size={CHECK_ICON_SIZE}
          />
        ) : (
          <View
            style={[
              styles.flag,
              isDerived ? styles.flagDerived : styles.flagExplicit,
            ]}
          />
        )}
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {row.name}
          </Text>
          {row.pastEndMessage ? (
            <Text numberOfLines={1} style={styles.meta}>
              {row.pastEndMessage}
            </Text>
          ) : isDerived ? (
            <Text numberOfLines={1} style={styles.meta}>
              Loop boundary
            </Text>
          ) : null}
        </View>
        <Text style={styles.time}>{row.timeLabel}</Text>
      </Pressable>
      {isSelecting || row.actions.length === 0 ? null : (
        <SurfaceIconButton
          accessibilityLabel={`Actions for ${row.name}`}
          icon="dots-vertical"
          onPress={onOpenMenu}
          size={FLAG_ICON_SIZE + 2}
          style={styles.menuButton}
        />
      )}
    </View>
  );
};

const FLAG_WIDTH = 3;
const FLAG_HEIGHT = 22;
const DERIVED_FLAG_HEIGHT = 12;

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 2,
  },
  dimmed: {
    opacity: INTERACTION_STATE_OPACITY.disabled,
  },
  flag: {
    width: FLAG_WIDTH,
    borderRadius: appTheme.radius.pill,
  },
  // Same language as the waveform: an accent hairline for the user's own
  // markers, a shorter dimmer tick for loop boundaries.
  flagDerived: {
    height: DERIVED_FLAG_HEIGHT,
    backgroundColor: appTheme.colors.textFaint,
  },
  flagExplicit: {
    height: FLAG_HEIGHT,
    backgroundColor: appTheme.colors.accent,
  },
  main: {
    flex: 1,
    minHeight: appTheme.space.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.sm,
    paddingVertical: appTheme.space.xs,
  },
  menuButton: {
    borderWidth: 0,
  },
  meta: {
    ...appTheme.type.rowMeta,
    color: appTheme.colors.textMuted,
  },
  name: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
  pressed: {
    opacity: INTERACTION_STATE_OPACITY.pressed,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.xs,
  },
  time: {
    ...appTheme.type.timecode,
    color: appTheme.colors.textSecondary,
  },
});
