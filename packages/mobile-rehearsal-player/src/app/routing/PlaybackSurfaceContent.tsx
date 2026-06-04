import { MaterialCommunityIcons } from '@expo/vector-icons';
import type {
  PlayableItem,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import { type ComponentProps } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { appTheme } from '../utils/theme';
import {
  PlaybackTimelineCard,
  PlaybackVolumeCard,
} from './PlaybackControlCards';
import { PlaybackSessionModeCard } from './PlaybackSessionModeCard';
import { resolveVisibleRepeatModes } from './playback-session-mode-options';
import { getQueueListMaxHeight } from './queue-surface-layout';
import type {
  NowPlayingSurfaceSummary,
  UpNextSurfaceSummary,
} from './shell-model';

type PlaybackPillProps = {
  label: string;
  tone?: 'primary' | 'secondary';
};

type SurfaceIconButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  size?: number;
  tone?: 'primary' | 'secondary';
};

type NowPlayingSurfaceProps = {
  activePlayableItem: PlayableItem;
  activeQueueMode: RehearsalQueueMode | null;
  activeRepeatMode: RepeatMode | null;
  canSeekActivePlayback: boolean;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  isSavingQueueAsPlaylist: boolean;
  isPlaybackToggleDisabled: boolean;
  onAdjustPlaybackVolume: (volumeLevel: number) => void;
  onAppendQueueToPlaylist: () => void;
  onClose: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onSeekToPosition: (positionSeconds: number) => void;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSaveQueueAsPlaylist: () => void;
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
  isPlaybackToggleDisabled: boolean;
  onClose: () => void;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSelectRepeatMode: (mode: RepeatMode) => void;
  onShowNowPlaying: () => void;
  summary: UpNextSurfaceSummary;
};

const PlaybackPill = ({ label, tone = 'secondary' }: PlaybackPillProps) => {
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

export const NowPlayingSurface = ({
  activePlayableItem,
  activeQueueMode,
  activeRepeatMode,
  canSeekActivePlayback,
  canSkipNextItem,
  canSkipPreviousItem,
  isSavingQueueAsPlaylist,
  isPlaybackToggleDisabled,
  onAdjustPlaybackVolume,
  onAppendQueueToPlaylist,
  onClose,
  onSeekBackward,
  onSeekForward,
  onSeekToPosition,
  onSelectQueueMode,
  onSaveQueueAsPlaylist,
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
        {summary.queuePlaylistActions ? (
          <View style={styles.queuePlaylistActionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={isSavingQueueAsPlaylist}
              onPress={onSaveQueueAsPlaylist}
              style={({ pressed }) => [
                styles.queuePlaylistSecondaryAction,
                pressed && !isSavingQueueAsPlaylist
                  ? styles.headerActionPressed
                  : null,
                isSavingQueueAsPlaylist ? styles.headerActionDisabled : null,
              ]}
            >
              <Text style={styles.queuePlaylistSecondaryActionLabel}>
                {isSavingQueueAsPlaylist
                  ? 'Saving queue…'
                  : summary.queuePlaylistActions.saveLabel}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSavingQueueAsPlaylist}
              onPress={onAppendQueueToPlaylist}
              style={({ pressed }) => [
                styles.queuePlaylistPrimaryAction,
                pressed && !isSavingQueueAsPlaylist
                  ? styles.headerActionPressed
                  : null,
                isSavingQueueAsPlaylist ? styles.headerActionDisabled : null,
              ]}
            >
              <Text style={styles.queuePlaylistPrimaryActionLabel}>
                {summary.queuePlaylistActions.updateLabel}
              </Text>
            </Pressable>
          </View>
        ) : null}
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
  isPlaybackToggleDisabled,
  onClose,
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

const styles = StyleSheet.create({
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
  surfaceDragHandleRegion: {
    gap: 12,
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
  queuePlaylistActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  queuePlaylistPrimaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#305c4d',
  },
  queuePlaylistPrimaryActionLabel: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '700',
  },
  queuePlaylistSecondaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#fffdf8',
  },
  queuePlaylistSecondaryActionLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 14,
    fontWeight: '700',
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
    flexGrow: 0,
  },
  queueListContent: {
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
  queueActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#305c4d',
  },
  queueActionButtonLabel: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '700',
  },
});
