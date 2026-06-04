import type {
  PlayableItem,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import { type ComponentProps } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

import {
  PlaybackTimelineCard,
  PlaybackVolumeCard,
} from './PlaybackControlCards';
import {
  QueuePlaylistActionRow,
  SurfaceIconButton,
} from './PlaybackSurfaceControls';
import { PlaybackSessionModeCard } from './PlaybackSessionModeCard';
import { resolveVisibleRepeatModes } from './playback-session-mode-options';
import { styles } from './playback-surface-styles';
import { getQueueListMaxHeight } from './queue-surface-layout';
import type {
  NowPlayingSurfaceSummary,
  UpNextSurfaceSummary,
} from './shell-model';

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

type QueueSurfaceProps = {
  activeQueueMode: RehearsalQueueMode;
  activeRepeatMode: RepeatMode;
  dragHandleProps?: ComponentProps<typeof View>;
  isSavingQueueAsPlaylist: boolean;
  isPlaybackToggleDisabled: boolean;
  onAppendQueueToPlaylist: () => void;
  onClose: () => void;
  onSaveQueueAsPlaylist: () => void;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSelectRepeatMode: (mode: RepeatMode) => void;
  onShowNowPlaying: () => void;
  summary: UpNextSurfaceSummary;
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

export const QueueSurface = ({
  activeQueueMode,
  activeRepeatMode,
  dragHandleProps,
  isSavingQueueAsPlaylist,
  isPlaybackToggleDisabled,
  onAppendQueueToPlaylist,
  onClose,
  onSaveQueueAsPlaylist,
  onSelectQueueMode,
  onSelectRepeatMode,
  onShowNowPlaying,
  summary,
}: QueueSurfaceProps) => {
  const { height: windowHeight } = useWindowDimensions();
  const queueListMaxHeight = getQueueListMaxHeight(windowHeight);

  return (
    <View style={styles.sheetCard}>
      <View {...dragHandleProps} style={styles.surfaceDragHandleRegion}>
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
      </View>

      <View style={styles.summaryGroup}>
        <Text style={styles.queueSurfaceTitle}>Active rehearsal queue</Text>
        <Text style={styles.subtitle}>{summary.collectionLabel}</Text>
      </View>

      {summary.queuePlaylistActions ? (
        <QueuePlaylistActionRow
          actions={summary.queuePlaylistActions}
          isMutating={isSavingQueueAsPlaylist}
          onAppendQueueToPlaylist={onAppendQueueToPlaylist}
          onSaveQueueAsPlaylist={onSaveQueueAsPlaylist}
        />
      ) : null}

      <PlaybackSessionModeCard
        isDisabled={isPlaybackToggleDisabled}
        onSelectQueueMode={onSelectQueueMode}
        onSelectRepeatMode={onSelectRepeatMode}
        queueMode={activeQueueMode}
        repeatMode={activeRepeatMode}
      />

      <ScrollView
        bounces={false}
        contentContainerStyle={styles.queueListContent}
        showsVerticalScrollIndicator={summary.items.length > 4}
        style={[styles.queueList, { maxHeight: queueListMaxHeight }]}
      >
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
      </ScrollView>
    </View>
  );
};
