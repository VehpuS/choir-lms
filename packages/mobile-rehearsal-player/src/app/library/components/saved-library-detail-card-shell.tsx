import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '../../components/app-icon';
import { OutlinedActionButton } from '../../components/outlined-action-button';
import { appTheme } from '../../utils/theme';
import { INTERACTION_STATE_OPACITY } from './interaction-style-tokens';

const { colors, space } = appTheme;
const BACK_ICON_SIZE = 20;

type DetailAction = {
  disabled: boolean;
  icon?: AppIconName;
  label: string;
  onPress: () => void;
  tone: 'primary' | 'secondary';
};

type SavedLibraryDetailCardShellProps = {
  body?: string | null;
  children: ReactNode;
  closeAccessibilityLabel?: string;
  eyebrow?: string | null;
  headerAction?: ReactNode;
  metadataLabel: string;
  onClose: () => void;
  playbackControls?: ReactNode;
  primaryAction?: DetailAction;
  secondaryAction?: DetailAction;
  title: string;
};

// Playlist detail, tag detail, and the track-scoped loop view share this
// header. It sits on the ground like the Library list views (no card since
// 2.6): a 44pt back button, kicker eyebrow, sheet-scale title, muted meta,
// then the detail's playback controls as a half-width outlined pair (1c).
export const SavedLibraryDetailCardShell = ({
  body,
  children,
  closeAccessibilityLabel = 'Close detail view',
  eyebrow,
  headerAction,
  metadataLabel,
  onClose,
  playbackControls,
  primaryAction,
  secondaryAction,
  title,
}: SavedLibraryDetailCardShellProps) => {
  const actions = [primaryAction, secondaryAction].filter(
    (action): action is DetailAction => Boolean(action),
  );
  const resolvedPlaybackControls =
    playbackControls ??
    (actions.length > 0 ? (
      <View style={styles.actionRow}>
        {actions.map((action) => {
          return (
            <OutlinedActionButton
              disabled={action.disabled}
              fill
              icon={action.icon}
              key={action.label}
              label={action.label}
              onPress={action.onPress}
              variant={action.tone === 'primary' ? 'accent' : 'neutral'}
            />
          );
        })}
      </View>
    ) : null);

  return (
    <View style={styles.shell}>
      <View style={styles.navigationRow}>
        <Pressable
          accessibilityLabel={closeAccessibilityLabel}
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? styles.pressed : undefined,
          ]}
        >
          <AppIcon
            color={colors.text}
            name="chevron-left"
            size={BACK_ICON_SIZE}
          />
        </Pressable>
        {headerAction}
      </View>

      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {metadataLabel ? (
          <Text style={styles.metadata}>{metadataLabel}</Text>
        ) : null}
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>

      {resolvedPlaybackControls ? (
        <View style={styles.group}>
          <Text style={styles.kicker}>Playback controls</Text>
          {resolvedPlaybackControls}
        </View>
      ) : null}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  backButton: {
    width: space.touchTarget,
    height: space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderButton,
    borderRadius: appTheme.radius.md,
  },
  body: {
    ...appTheme.type.body,
    color: colors.textMuted,
    lineHeight: 20,
  },
  eyebrow: {
    ...appTheme.type.kicker,
    color: colors.textMuted,
  },
  group: {
    gap: space.sm,
  },
  headerCopy: {
    gap: space.xxs,
  },
  kicker: {
    ...appTheme.type.kicker,
    color: colors.textMuted,
  },
  metadata: {
    fontSize: 13,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: INTERACTION_STATE_OPACITY.pressed,
  },
  shell: {
    gap: space.md,
  },
  title: {
    ...appTheme.type.sheetTitle,
    color: colors.text,
  },
});
