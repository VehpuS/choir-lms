import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { OutlinedActionButton } from '../../components/outlined-action-button';
import { appTheme } from '../../utils/theme';
import { savedPlaylistSectionStyles as styles } from './saved-playlist-section-styles';

type DetailAction = {
  disabled: boolean;
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
    <View style={styles.editorCard}>
      <Pressable
        accessibilityLabel={closeAccessibilityLabel}
        accessibilityRole="button"
        onPress={onClose}
        style={({ pressed }) => [
          styles.compactIconButton,
          pressed ? styles.actionButtonPressed : undefined,
        ]}
      >
        <AppIcon color={appTheme.colors.text} name="chevron-left" size={20} />
      </Pressable>

      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionBody}>{metadataLabel}</Text>
          {body ? <Text style={styles.editorBody}>{body}</Text> : null}
        </View>
      </View>

      {headerAction}

      {resolvedPlaybackControls ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Playback controls</Text>
          {resolvedPlaybackControls}
        </View>
      ) : null}

      {children}
    </View>
  );
};
