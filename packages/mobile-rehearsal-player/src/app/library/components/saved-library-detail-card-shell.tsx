import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

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

const getActionStyle = (tone: DetailAction['tone']) => {
  return tone === 'primary' ? styles.primaryButton : styles.secondaryButton;
};

const getActionLabelStyle = (tone: DetailAction['tone']) => {
  return tone === 'primary'
    ? styles.primaryButtonLabel
    : styles.secondaryButtonLabel;
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
            <Pressable
              accessibilityRole="button"
              disabled={action.disabled}
              key={action.label}
              onPress={action.onPress}
              style={({ pressed }) => [
                getActionStyle(action.tone),
                pressed && !action.disabled
                  ? styles.actionButtonPressed
                  : undefined,
                action.disabled ? styles.actionButtonDisabled : undefined,
              ]}
            >
              <Text style={getActionLabelStyle(action.tone)}>
                {action.label}
              </Text>
            </Pressable>
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
        <Text style={styles.secondaryButtonLabel}>←</Text>
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
