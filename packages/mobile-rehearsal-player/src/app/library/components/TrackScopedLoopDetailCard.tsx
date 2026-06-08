import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { PlaylistPlaybackActionCopy } from '../utils/saved-playlist-playback-view-model';
import type { TrackScopedLoopDetailCopy } from '../utils/track-scoped-loop-view-model';
import { savedPlaylistSectionStyles as styles } from './saved-playlist-section-styles';

type TrackScopedLoopDetailCardProps = {
  children: ReactNode;
  detailCopy: TrackScopedLoopDetailCopy;
  isMakeNewLoopDisabled: boolean;
  makeNewLoopLabel: string;
  onClose: () => void;
  onMakeNewLoop: () => void;
  onPlayOrderedTrackLoops: () => void;
  orderedPlaybackAction: PlaylistPlaybackActionCopy;
};

export const TrackScopedLoopDetailCard = ({
  children,
  detailCopy,
  isMakeNewLoopDisabled,
  makeNewLoopLabel,
  onClose,
  onMakeNewLoop,
  onPlayOrderedTrackLoops,
  orderedPlaybackAction,
}: TrackScopedLoopDetailCardProps) => {
  return (
    <View style={styles.editorCard}>
      <Pressable
        accessibilityLabel="Close track loop view"
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
          <Text style={styles.eyebrow}>Track loops</Text>
          <Text style={styles.sectionTitle}>{detailCopy.title}</Text>
          <Text style={styles.sectionBody}>{detailCopy.metadataLabel}</Text>
          <Text style={styles.editorBody}>{detailCopy.body}</Text>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Playback controls</Text>
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            disabled={orderedPlaybackAction.disabled}
            onPress={onPlayOrderedTrackLoops}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !orderedPlaybackAction.disabled
                ? styles.actionButtonPressed
                : undefined,
              orderedPlaybackAction.disabled
                ? styles.actionButtonDisabled
                : undefined,
            ]}
          >
            <Text style={styles.primaryButtonLabel}>
              ▶ {orderedPlaybackAction.label}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isMakeNewLoopDisabled}
            onPress={onMakeNewLoop}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && !isMakeNewLoopDisabled
                ? styles.actionButtonPressed
                : undefined,
              isMakeNewLoopDisabled ? styles.actionButtonDisabled : undefined,
            ]}
          >
            <Text style={styles.secondaryButtonLabel}>{makeNewLoopLabel}</Text>
          </Pressable>
        </View>
      </View>

      {children}
    </View>
  );
};
