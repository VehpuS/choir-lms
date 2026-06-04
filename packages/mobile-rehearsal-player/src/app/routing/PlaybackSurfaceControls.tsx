import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { appTheme } from '../utils/theme';
import type { UpNextSurfaceSummary } from './shell-model';
import { styles } from './playback-surface-styles';

export type SurfaceIconButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  size?: number;
  tone?: 'primary' | 'secondary';
};

type QueuePlaylistActionRowProps = {
  actions: NonNullable<UpNextSurfaceSummary['queuePlaylistActions']>;
  isMutating: boolean;
  onAppendQueueToPlaylist: () => void;
  onSaveQueueAsPlaylist: () => void;
};

export const SurfaceIconButton = ({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  size = 22,
  tone = 'secondary',
}: SurfaceIconButtonProps) => {
  const isPrimary = tone === 'primary';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        isPrimary
          ? styles.transportButtonPrimary
          : styles.transportButtonSecondary,
        pressed && !disabled ? styles.headerActionPressed : null,
        disabled ? styles.headerActionDisabled : null,
      ]}
    >
      <MaterialCommunityIcons
        color={isPrimary ? '#fff8ef' : appTheme.colors.primaryText}
        name={icon}
        size={size}
      />
    </Pressable>
  );
};

export const QueuePlaylistActionRow = ({
  actions,
  isMutating,
  onAppendQueueToPlaylist,
  onSaveQueueAsPlaylist,
}: QueuePlaylistActionRowProps) => {
  return (
    <View style={styles.queuePlaylistActionRow}>
      <Pressable
        accessibilityRole="button"
        disabled={isMutating}
        onPress={onSaveQueueAsPlaylist}
        style={({ pressed }) => [
          styles.queuePlaylistSecondaryAction,
          pressed && !isMutating ? styles.headerActionPressed : null,
          isMutating ? styles.headerActionDisabled : null,
        ]}
      >
        <Text style={styles.queuePlaylistSecondaryActionLabel}>
          {isMutating ? 'Saving queue…' : actions.saveLabel}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={isMutating}
        onPress={onAppendQueueToPlaylist}
        style={({ pressed }) => [
          styles.queuePlaylistPrimaryAction,
          pressed && !isMutating ? styles.headerActionPressed : null,
          isMutating ? styles.headerActionDisabled : null,
        ]}
      >
        <Text style={styles.queuePlaylistPrimaryActionLabel}>
          {actions.updateLabel}
        </Text>
      </Pressable>
    </View>
  );
};
