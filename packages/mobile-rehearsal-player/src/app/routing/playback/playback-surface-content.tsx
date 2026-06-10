import type {
  PlayableItem,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import { Text, View } from 'react-native';

import {
  PlaybackTimelineCard,
  PlaybackVolumeCard,
} from './playback-control-cards';
import { SurfaceIconButton } from '../../components/surface-icon-button';
import { PlaybackSessionModeCard } from './playback-session-mode-card';
import { resolveVisibleRepeatModes } from './playback-session-mode-options';
import { styles } from './playback-surface-styles';
import type {
  NowPlayingSurfaceSummary,
  UpNextSurfaceSummary,
} from '../shell/shell-model';

type NowPlayingSurfaceProps = {
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
};

export const NowPlayingSurface = ({
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
}: NowPlayingSurfaceProps) => {
  const transportIconSize = summary.supportsQueueNavigation ? 22 : 24;

  return (
    <View style={styles.sheetCard}>
      <View style={styles.surfaceHandle} />
      <View style={styles.sheetHeaderRow}>
        <Text style={styles.sheetEyebrow}>
          {summary.supportsQueueNavigation ? 'Rehearsing queue' : 'Rehearsing'}
        </Text>
        <View style={styles.headerActionRow}>
          {summary.supportsQueueNavigation && queueSummary ? (
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

      <View style={styles.summaryGroup}>
        <View style={styles.summaryMetaRow}>
          <Text style={styles.statusCaption}>{summary.statusLabel}</Text>
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
        progressRatio={summary.waveformProgressRatio}
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

      {activeRepeatMode ? (
        <PlaybackSessionModeCard
          isDisabled={isPlaybackToggleDisabled}
          onSelectQueueMode={onSelectQueueMode}
          onSelectRepeatMode={onSelectRepeatMode}
          queueMode={activeQueueMode ?? 'ordered'}
          repeatMode={activeRepeatMode}
          repeatModes={resolveVisibleRepeatModes(Boolean(activeQueueMode))}
          showQueueModeControls={Boolean(activeQueueMode)}
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
