import type {
  PlayableItem,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../utils/theme';
import {
  PlaybackTimelineCard,
  PlaybackVolumeCard,
} from './PlaybackControlCards';
import { PlaybackSessionModeCard } from './PlaybackSessionModeCard';
import type {
  NowPlayingSurfaceSummary,
  UpNextSurfaceSummary,
} from './shell-model';

type PlaybackSurfaceMode = 'now-playing' | 'queue';

type PlaybackSurfaceProps = {
  activePlayableItem: PlayableItem | null;
  activeQueueMode: RehearsalQueueMode | null;
  activeRepeatMode: RepeatMode | null;
  canSeekActivePlayback: boolean;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  isPlaybackToggleDisabled: boolean;
  nowPlayingSummary: NowPlayingSurfaceSummary | null;
  onAdjustPlaybackVolume: (volumeLevel: number) => void;
  onClose: () => void;
  onSeekToPosition: (positionSeconds: number) => void;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSelectRepeatMode: (mode: RepeatMode) => void;
  onShowNowPlaying: () => void;
  onShowQueue: () => void;
  onSkipNextItem: () => void;
  onSkipPreviousItem: () => void;
  onTogglePlayback: () => void;
  playbackPositionSeconds: number;
  playbackToggleLabel: string;
  playbackVolumeLevel: number;
  queueSummary: UpNextSurfaceSummary | null;
  surface: PlaybackSurfaceMode | null;
};

const PlaybackPill = ({
  label,
  tone = 'secondary',
}: {
  label: string;
  tone?: 'primary' | 'secondary';
}) => {
  return (
    <View
      style={[
        styles.pill,
        tone === 'primary' ? styles.pillPrimary : styles.pillSecondary,
      ]}
    >
      <Text
        style={
          tone === 'primary'
            ? styles.pillPrimaryLabel
            : styles.pillSecondaryLabel
        }
      >
        {label}
      </Text>
    </View>
  );
};

const TransportButton = ({
  disabled = false,
  label,
  onPress,
  tone = 'secondary',
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary';
}) => {
  const isPrimary = tone === 'primary';

  return (
    <Pressable
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
      <Text
        style={
          isPrimary
            ? styles.transportButtonPrimaryLabel
            : styles.transportButtonSecondaryLabel
        }
      >
        {label}
      </Text>
    </Pressable>
  );
};

const NowPlayingSurface = ({
  activePlayableItem,
  activeQueueMode,
  activeRepeatMode,
  canSeekActivePlayback,
  canSkipNextItem,
  canSkipPreviousItem,
  isPlaybackToggleDisabled,
  onAdjustPlaybackVolume,
  onClose,
  onSeekToPosition,
  onSelectQueueMode,
  onSelectRepeatMode,
  onShowQueue,
  onSkipNextItem,
  onSkipPreviousItem,
  onTogglePlayback,
  playbackPositionSeconds,
  playbackToggleLabel,
  playbackVolumeLevel,
  queueSummary,
  summary,
}: {
  activePlayableItem: PlayableItem;
  activeQueueMode: RehearsalQueueMode | null;
  activeRepeatMode: RepeatMode | null;
  canSeekActivePlayback: boolean;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  isPlaybackToggleDisabled: boolean;
  onAdjustPlaybackVolume: (volumeLevel: number) => void;
  onClose: () => void;
  onSeekToPosition: (positionSeconds: number) => void;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSelectRepeatMode: (mode: RepeatMode) => void;
  onShowQueue: () => void;
  onSkipNextItem: () => void;
  onSkipPreviousItem: () => void;
  onTogglePlayback: () => void;
  playbackPositionSeconds: number;
  playbackToggleLabel: string;
  playbackVolumeLevel: number;
  queueSummary: UpNextSurfaceSummary | null;
  summary: NowPlayingSurfaceSummary;
}) => {
  return (
    <View style={styles.sheetCard}>
      <View style={styles.sheetHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.headerAction,
            pressed ? styles.headerActionPressed : null,
          ]}
        >
          <Text style={styles.headerActionLabel}>Close</Text>
        </Pressable>
        <Text style={styles.sheetEyebrow}>Now playing</Text>
        <Pressable
          accessibilityRole="button"
          disabled={!queueSummary}
          onPress={onShowQueue}
          style={({ pressed }) => [
            styles.headerAction,
            pressed && queueSummary ? styles.headerActionPressed : null,
            !queueSummary ? styles.headerActionDisabled : null,
          ]}
        >
          <Text style={styles.headerActionLabel}>Up Next</Text>
        </Pressable>
      </View>

      <View style={styles.heroArtwork}>
        <Text style={styles.heroArtworkLabel}>
          {summary.rangeLabel ? 'Saved loop' : 'Saved track'}
        </Text>
      </View>

      <View style={styles.summaryGroup}>
        <Text style={styles.title}>{summary.title}</Text>
        <Text style={styles.subtitle}>{summary.collectionLabel}</Text>
        {summary.rangeLabel ? (
          <Text style={styles.rangeLabel}>{summary.rangeLabel}</Text>
        ) : null}
        <Text style={styles.progressLabel}>{summary.progressLabel}</Text>
      </View>

      <View style={styles.pillRow}>
        <PlaybackPill label={summary.statusLabel} tone="primary" />
        <PlaybackPill label={summary.queueLabel} />
      </View>

      {activeQueueMode && activeRepeatMode ? (
        <PlaybackSessionModeCard
          isDisabled={isPlaybackToggleDisabled}
          onSelectQueueMode={onSelectQueueMode}
          onSelectRepeatMode={onSelectRepeatMode}
          queueMode={activeQueueMode}
          repeatMode={activeRepeatMode}
        />
      ) : null}

      <PlaybackTimelineCard
        activePlayableItem={activePlayableItem}
        canSeekActivePlayback={canSeekActivePlayback}
        onSeekToPosition={onSeekToPosition}
        playbackPositionSeconds={playbackPositionSeconds}
      />

      <View style={styles.transportRow}>
        <TransportButton
          disabled={!canSkipPreviousItem}
          label="Prev"
          onPress={onSkipPreviousItem}
        />
        <TransportButton
          disabled={isPlaybackToggleDisabled}
          label={playbackToggleLabel}
          onPress={onTogglePlayback}
          tone="primary"
        />
        <TransportButton
          disabled={!canSkipNextItem}
          label="Next"
          onPress={onSkipNextItem}
        />
      </View>

      <View style={styles.contextCard}>
        <Text style={styles.contextTitle}>Rehearsal context</Text>
        <Text style={styles.contextBody}>{summary.playbackLabel}</Text>
      </View>

      {summary.upNextLabel ? (
        <View style={styles.contextCard}>
          <Text style={styles.contextTitle}>Up next</Text>
          <Text style={styles.contextBody}>{summary.upNextLabel}</Text>
        </View>
      ) : null}

      <PlaybackVolumeCard
        isDisabled={false}
        onSetPlaybackVolume={onAdjustPlaybackVolume}
        volumeLevel={playbackVolumeLevel}
      />
    </View>
  );
};

const QueueSurface = ({
  activeQueueMode,
  activeRepeatMode,
  isPlaybackToggleDisabled,
  onClose,
  onSelectQueueMode,
  onSelectRepeatMode,
  onShowNowPlaying,
  summary,
}: {
  activeQueueMode: RehearsalQueueMode;
  activeRepeatMode: RepeatMode;
  isPlaybackToggleDisabled: boolean;
  onClose: () => void;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSelectRepeatMode: (mode: RepeatMode) => void;
  onShowNowPlaying: () => void;
  summary: UpNextSurfaceSummary;
}) => {
  return (
    <View style={styles.sheetCard}>
      <View style={styles.sheetHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={onShowNowPlaying}
          style={({ pressed }) => [
            styles.headerAction,
            pressed ? styles.headerActionPressed : null,
          ]}
        >
          <Text style={styles.headerActionLabel}>Now playing</Text>
        </Pressable>
        <Text style={styles.sheetEyebrow}>Up Next</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [
            styles.headerAction,
            pressed ? styles.headerActionPressed : null,
          ]}
        >
          <Text style={styles.headerActionLabel}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.summaryGroup}>
        <Text style={styles.title}>Active rehearsal queue</Text>
        <Text style={styles.subtitle}>{summary.collectionLabel}</Text>
      </View>

      <View style={styles.pillRow}>
        <PlaybackPill label={summary.queueLabel} tone="primary" />
      </View>

      <PlaybackSessionModeCard
        isDisabled={isPlaybackToggleDisabled}
        onSelectQueueMode={onSelectQueueMode}
        onSelectRepeatMode={onSelectRepeatMode}
        queueMode={activeQueueMode}
        repeatMode={activeRepeatMode}
      />

      <View style={styles.queueList}>
        {summary.items.map((item) => {
          return (
            <View
              key={item.key}
              style={[
                styles.queueCard,
                item.isCurrent ? styles.queueCardCurrent : null,
              ]}
            >
              <Text style={styles.queueEyebrow}>
                {item.isCurrent ? 'Now playing' : 'Up next'}
              </Text>
              <Text style={styles.queueTitle}>{item.title}</Text>
              <Text style={styles.queueDetail}>{item.detail}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export const PlaybackSurface = ({
  activePlayableItem,
  activeQueueMode,
  activeRepeatMode,
  canSeekActivePlayback,
  canSkipNextItem,
  canSkipPreviousItem,
  isPlaybackToggleDisabled,
  nowPlayingSummary,
  onAdjustPlaybackVolume,
  onClose,
  onSeekToPosition,
  onSelectQueueMode,
  onSelectRepeatMode,
  onShowNowPlaying,
  onShowQueue,
  onSkipNextItem,
  onSkipPreviousItem,
  onTogglePlayback,
  playbackPositionSeconds,
  playbackToggleLabel,
  playbackVolumeLevel,
  queueSummary,
  surface,
}: PlaybackSurfaceProps) => {
  if (!surface) {
    return null;
  }

  const canRenderQueue = surface === 'queue' && queueSummary;
  const canRenderNowPlaying = surface === 'now-playing' && nowPlayingSummary;

  if (!canRenderQueue && !canRenderNowPlaying) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable
        accessibilityRole="button"
        onPress={onClose}
        style={styles.backdrop}
      />
      <View style={styles.sheetContainer}>
        {canRenderQueue && queueSummary ? (
          <QueueSurface
            activeQueueMode={activeQueueMode ?? 'ordered'}
            activeRepeatMode={activeRepeatMode ?? 'off'}
            isPlaybackToggleDisabled={isPlaybackToggleDisabled}
            onClose={onClose}
            onSelectQueueMode={onSelectQueueMode}
            onSelectRepeatMode={onSelectRepeatMode}
            onShowNowPlaying={onShowNowPlaying}
            summary={queueSummary}
          />
        ) : null}
        {canRenderNowPlaying && nowPlayingSummary && activePlayableItem ? (
          <NowPlayingSurface
            activePlayableItem={activePlayableItem}
            activeQueueMode={activeQueueMode}
            activeRepeatMode={activeRepeatMode}
            canSeekActivePlayback={canSeekActivePlayback}
            canSkipNextItem={canSkipNextItem}
            canSkipPreviousItem={canSkipPreviousItem}
            isPlaybackToggleDisabled={isPlaybackToggleDisabled}
            onAdjustPlaybackVolume={onAdjustPlaybackVolume}
            onClose={onClose}
            onSeekToPosition={onSeekToPosition}
            onSelectQueueMode={onSelectQueueMode}
            onSelectRepeatMode={onSelectRepeatMode}
            onShowQueue={onShowQueue}
            onSkipNextItem={onSkipNextItem}
            onSkipPreviousItem={onSkipPreviousItem}
            onTogglePlayback={onTogglePlayback}
            playbackPositionSeconds={playbackPositionSeconds}
            playbackToggleLabel={playbackToggleLabel}
            playbackVolumeLevel={playbackVolumeLevel}
            queueSummary={queueSummary}
            summary={nowPlayingSummary}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 15,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(23, 50, 41, 0.32)',
  },
  sheetContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  sheetCard: {
    flex: 1,
    gap: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 28,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetEyebrow: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerAction: {
    minWidth: 84,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f3ecdf',
  },
  headerActionPressed: {
    opacity: 0.84,
  },
  headerActionDisabled: {
    opacity: 0.5,
  },
  headerActionLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroArtwork: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    borderRadius: 24,
    backgroundColor: appTheme.colors.heroBackground,
  },
  heroArtworkLabel: {
    color: '#fff8ef',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  summaryGroup: {
    gap: 6,
  },
  title: {
    color: appTheme.colors.primaryText,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  subtitle: {
    color: appTheme.colors.secondaryText,
    fontSize: 15,
    lineHeight: 22,
  },
  rangeLabel: {
    color: '#2d584a',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  progressLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 18,
    fontWeight: '700',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  transportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  pillPrimary: {
    backgroundColor: '#305c4d',
  },
  pillSecondary: {
    backgroundColor: '#f3ecdf',
  },
  pillPrimaryLabel: {
    color: '#fff8ef',
    fontSize: 13,
    fontWeight: '700',
  },
  pillSecondaryLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  transportButtonPrimary: {
    minWidth: 84,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#305c4d',
  },
  transportButtonSecondary: {
    minWidth: 68,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  transportButtonPrimaryLabel: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  transportButtonSecondaryLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  contextCard: {
    gap: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 18,
    backgroundColor: '#faf6ee',
  },
  contextTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  contextBody: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  queueList: {
    gap: 12,
  },
  queueCard: {
    gap: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 18,
    backgroundColor: '#faf6ee',
  },
  queueCardCurrent: {
    borderColor: '#305c4d',
    backgroundColor: '#f1f7f3',
  },
  queueEyebrow: {
    color: appTheme.colors.secondaryText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  queueTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 16,
    fontWeight: '700',
  },
  queueDetail: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
});
