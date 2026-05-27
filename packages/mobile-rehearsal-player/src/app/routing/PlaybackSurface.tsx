import { MaterialCommunityIcons } from '@expo/vector-icons';
import type {
  PlayableItem,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import { useEffect, useMemo, useRef, type ComponentProps } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { appTheme } from '../utils/theme';
import {
  PlaybackTimelineCard,
  PlaybackVolumeCard,
} from './PlaybackControlCards';
import { PlaybackWaveform } from './PlaybackWaveform';
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
  onSeekBackward: () => void;
  onSeekForward: () => void;
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

const SurfaceIconButton = ({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  size = 22,
  tone = 'secondary',
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  size?: number;
  tone?: 'primary' | 'secondary';
}) => {
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
  onSeekBackward,
  onSeekForward,
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
  onSeekBackward: () => void;
  onSeekForward: () => void;
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
  const transportIconSize = summary.supportsQueueNavigation ? 22 : 24;

  return (
    <View style={styles.sheetCard}>
      <View style={styles.surfaceHandle} />

      <View style={styles.sheetHeaderRow}>
        <Text style={styles.sheetEyebrow}>
          {summary.supportsQueueNavigation ? 'Rehearsing queue' : 'Rehearsing'}
        </Text>
        <View style={styles.headerActionRow}>
          {queueSummary ? (
            <SurfaceIconButton
              accessibilityLabel="Show queue"
              icon="view-list"
              onPress={onShowQueue}
            />
          ) : null}
          <SurfaceIconButton
            accessibilityLabel="Dismiss playback"
            icon="chevron-down"
            onPress={onClose}
          />
        </View>
      </View>

      <PlaybackWaveform
        activePlayableItem={activePlayableItem}
        interactive={canSeekActivePlayback}
        onScrubToPosition={onSeekToPosition}
        progressRatio={summary.waveformProgressRatio}
        style={styles.heroWaveform}
        variant="hero"
      />

      <View style={styles.summaryGroup}>
        <View style={styles.summaryMetaRow}>
          <Text style={styles.statusCaption}>{summary.statusLabel}</Text>
          {summary.supportsQueueNavigation ? (
            <Text style={styles.summaryMetaText}>{summary.queueLabel}</Text>
          ) : null}
        </View>
        <Text numberOfLines={2} style={styles.title}>
          {summary.title}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {summary.collectionLabel}
        </Text>
        {summary.rangeLabel ? (
          <Text numberOfLines={1} style={styles.rangeLabel}>
            {summary.rangeLabel}
          </Text>
        ) : null}
        <Text style={styles.progressLabel}>{summary.progressLabel}</Text>
        {summary.upNextLabel ? (
          <Text numberOfLines={1} style={styles.inlineContextText}>
            Next • {summary.upNextLabel}
          </Text>
        ) : null}
      </View>

      <PlaybackTimelineCard
        activePlayableItem={activePlayableItem}
        canSeekActivePlayback={canSeekActivePlayback}
        onSeekToPosition={onSeekToPosition}
        playbackPositionSeconds={playbackPositionSeconds}
      />

      <View style={styles.transportRow}>
        {summary.supportsQueueNavigation ? (
          <SurfaceIconButton
            accessibilityLabel="Previous queue item"
            disabled={!canSkipPreviousItem}
            icon="skip-previous"
            onPress={onSkipPreviousItem}
            size={transportIconSize}
          />
        ) : null}
        <SurfaceIconButton
          accessibilityLabel="Back 15 seconds"
          disabled={!canSeekActivePlayback}
          icon="rewind-15"
          onPress={onSeekBackward}
          size={transportIconSize}
        />
        <SurfaceIconButton
          accessibilityLabel={playbackToggleLabel}
          disabled={isPlaybackToggleDisabled}
          icon={playbackToggleLabel === 'Pause' ? 'pause' : 'play'}
          onPress={onTogglePlayback}
          size={32}
          tone="primary"
        />
        <SurfaceIconButton
          accessibilityLabel="Forward 15 seconds"
          disabled={!canSeekActivePlayback}
          icon="fast-forward-15"
          onPress={onSeekForward}
          size={transportIconSize}
        />
        {summary.supportsQueueNavigation ? (
          <SurfaceIconButton
            accessibilityLabel="Next queue item"
            disabled={!canSkipNextItem}
            icon="skip-next"
            onPress={onSkipNextItem}
            size={transportIconSize}
          />
        ) : null}
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
      <View style={styles.surfaceHandle} />

      <View style={styles.sheetHeaderRow}>
        <Text style={styles.sheetEyebrow}>Up Next</Text>
        <View style={styles.headerActionRow}>
          <SurfaceIconButton
            accessibilityLabel="Show now playing"
            icon="play-circle-outline"
            onPress={onShowNowPlaying}
          />
          <SurfaceIconButton
            accessibilityLabel="Dismiss queue"
            icon="chevron-down"
            onPress={onClose}
          />
        </View>
      </View>

      <View style={styles.summaryGroup}>
        <Text style={styles.queueSurfaceTitle}>Active rehearsal queue</Text>
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
  onSeekBackward,
  onSeekForward,
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
  const translateY = useRef(new Animated.Value(32)).current;
  const canRenderQueue = surface === 'queue' && queueSummary;
  const canRenderNowPlaying = surface === 'now-playing' && nowPlayingSummary;

  const dismissSurface = () => {
    Animated.timing(translateY, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        translateY.setValue(32);
        onClose();
      }
    });
  };

  const resetSurfacePosition = () => {
    Animated.spring(translateY, {
      damping: 20,
      mass: 0.9,
      stiffness: 220,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    translateY.setValue(32);

    Animated.spring(translateY, {
      damping: 18,
      mass: 0.9,
      stiffness: 210,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [surface, translateY]);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.dy > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        translateY.setValue(Math.max(0, gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1.1) {
          dismissSurface();
          return;
        }

        resetSurfacePosition();
      },
      onPanResponderTerminate: () => {
        resetSurfacePosition();
      },
    });
  }, [translateY]);

  if (!surface) {
    return null;
  }

  if (!canRenderQueue && !canRenderNowPlaying) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable
        accessibilityRole="button"
        onPress={dismissSurface}
        style={styles.backdrop}
      />
      <View style={styles.sheetContainer}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.sheetFrame, { transform: [{ translateY }] }]}
        >
          {canRenderQueue && queueSummary ? (
            <QueueSurface
              activeQueueMode={activeQueueMode ?? 'ordered'}
              activeRepeatMode={activeRepeatMode ?? 'off'}
              isPlaybackToggleDisabled={isPlaybackToggleDisabled}
              onClose={dismissSurface}
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
              onClose={dismissSurface}
              onSeekBackward={onSeekBackward}
              onSeekForward={onSeekForward}
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
        </Animated.View>
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
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  sheetFrame: {
    width: '100%',
  },
  sheetCard: {
    gap: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 32,
    backgroundColor: appTheme.colors.surfaceBackground,
  },
  surfaceHandle: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d0d8d2',
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerActionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  sheetEyebrow: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerActionPressed: {
    opacity: 0.84,
  },
  headerActionDisabled: {
    opacity: 0.5,
  },
  heroWaveform: {
    marginTop: 2,
  },
  summaryGroup: {
    gap: 4,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  statusCaption: {
    color: '#2d584a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryMetaText: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: appTheme.colors.primaryText,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  subtitle: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  rangeLabel: {
    color: '#2d584a',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  progressLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 16,
    fontWeight: '700',
  },
  inlineContextText: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  transportRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#305c4d',
  },
  transportButtonSecondary: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  queueList: {
    gap: 12,
  },
  queueSurfaceTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
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
