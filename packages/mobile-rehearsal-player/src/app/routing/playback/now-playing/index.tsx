import type {
  PlayableItem,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { FadedRule } from '../../../components/faded-rule';
import { SurfaceIconButton } from '../../../components/surface-icon-button';
import {
  useHasLyrics,
  useIsPlayableItemSaved,
} from '../../../library/components/saved-item-menu/saved-item-availability-context';
import {
  requestSavedItemAction,
  resolveSavedItemShortcuts,
} from '../../../library/components/saved-item-menu/saved-item-requests';
import { OptionsMenuSheet } from '../../../library/components/options-menu-sheet';
import { requestLoopBuilder } from '../../../library/loops/utils/loop-builder-request';
import { appTheme } from '../../../utils/theme';
import type {
  NowPlayingSurfaceSummary,
  UpNextSurfaceSummary,
} from '../../shell/shell-model';
import {
  NowPlayingTimeline,
  PlaybackPracticeRow,
  PlaybackVolumeRow,
} from './now-playing-controls';
import { getNowPlayingKicker } from './now-playing-model';
import { resolveNowPlayingMakeLoopRequest } from './now-playing-menu-model';
import type { PlaybackShapingControls } from '../shaping/shaping-surface-model';
import { nowPlayingStyles as styles } from './styles';
import { NowPlayingTransportRow } from './now-playing-transport-row';

const LOOP_CHIP_ICON_SIZE = 16;

type NowPlayingSurfaceProps = {
  shaping: Pick<PlaybackShapingControls, 'canShapePitch' | 'effective'>;
  activePlayableItem: PlayableItem;
  activeQueueMode: RehearsalQueueMode | null;
  activeRepeatMode: RepeatMode | null;
  canSeekActivePlayback: boolean;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  downloadLabel: string | null;
  isPlaybackLoading: boolean;
  isPlaybackToggleDisabled: boolean;
  onAdjustPlaybackVolume: (volumeLevel: number) => void;
  onClose: () => void;
  onEditActiveLoop: (loopId: string) => void;
  onOpenShaping: () => void;
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

// A saved loop's chip opens the loop editor for it; a preview or other range
// has nothing to edit, so its chip stays a plain readout.
const LoopRangeChip = ({
  loopRange,
  onEdit,
}: {
  loopRange: NonNullable<NowPlayingSurfaceSummary['loopRange']>;
  onEdit?: () => void;
}) => {
  return (
    <Pressable
      accessibilityHint={onEdit ? 'Opens the loop editor' : undefined}
      accessibilityLabel={
        onEdit
          ? `Edit ${loopRange.accessibilityLabel.toLowerCase()}`
          : loopRange.accessibilityLabel
      }
      accessibilityRole={onEdit ? 'button' : undefined}
      accessible
      disabled={!onEdit}
      onPress={onEdit}
      style={({ pressed }) => [
        styles.loopChip,
        pressed && onEdit ? styles.pressed : null,
      ]}
    >
      <AppIcon
        color={appTheme.colors.accentText}
        name="repeat"
        size={LOOP_CHIP_ICON_SIZE}
      />
      <Text style={styles.loopChipText}>{loopRange.label}</Text>
    </Pressable>
  );
};

const TitleBlock = ({
  downloadLabel,
  onEditLoop,
  summary,
}: {
  downloadLabel: string | null;
  onEditLoop?: () => void;
  summary: NowPlayingSurfaceSummary;
}) => {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.statusKicker}>{summary.statusLabel}</Text>
      <Text numberOfLines={2} style={styles.title}>
        {summary.title}
      </Text>
      {summary.collectionLabel ? (
        <Text numberOfLines={1} style={styles.contextText}>
          {summary.collectionLabel}
        </Text>
      ) : null}
      {summary.shapingLabel ? (
        <Text numberOfLines={1} style={styles.contextText}>
          {summary.shapingLabel}
        </Text>
      ) : null}
      {downloadLabel ? (
        <Text numberOfLines={1} style={styles.downloadText}>
          {downloadLabel}
        </Text>
      ) : null}
      {summary.loopRange ? (
        <LoopRangeChip loopRange={summary.loopRange} onEdit={onEditLoop} />
      ) : null}
    </View>
  );
};

export const NowPlayingSurface = (props: NowPlayingSurfaceProps) => {
  const { summary } = props;
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const makeLoopRequest = resolveNowPlayingMakeLoopRequest({
    activePlayableItem: props.activePlayableItem,
    playbackPositionSeconds: props.playbackPositionSeconds,
  });
  const isSaved = useIsPlayableItemSaved(props.activePlayableItem);
  const hasLyrics = useHasLyrics(props.activePlayableItem);
  // The Library's item actions, plus `Make loop` from the playhead in place of
  // the plain one (task 8.26).
  const menuActions = [
    ...(makeLoopRequest
      ? [
          {
            id: 'make-loop',
            label: 'Make loop',
            onPress: () => {
              setIsMenuVisible(false);
              requestLoopBuilder(makeLoopRequest);
            },
          },
        ]
      : []),
    ...resolveSavedItemShortcuts({
      hasLyrics,
      isSaved,
      item: props.activePlayableItem,
    })
      .filter(({ id }) => !(makeLoopRequest && id === 'make-loop'))
      .map((shortcut) => ({
        id: shortcut.id,
        label: shortcut.label,
        onPress: () => {
          setIsMenuVisible(false);
          requestSavedItemAction(shortcut.request);
        },
        tone: shortcut.tone,
      })),
  ];

  return (
    <View style={styles.sheet}>
      <View style={styles.grabber} />
      <View style={styles.header}>
        <Text style={styles.headerKicker}>
          {getNowPlayingKicker(summary.supportsQueueNavigation)}
        </Text>
        <View style={styles.headerActions}>
          {summary.supportsQueueNavigation && props.queueSummary ? (
            <SurfaceIconButton
              accessibilityLabel="Show queue"
              icon="view-list"
              onPress={props.onShowQueue}
            />
          ) : null}
          {menuActions.length > 0 ? (
            <SurfaceIconButton
              accessibilityLabel="More actions"
              icon="dots-vertical"
              onPress={() => {
                setIsMenuVisible(true);
              }}
            />
          ) : null}
          <SurfaceIconButton
            accessibilityLabel="Dismiss playback"
            icon="chevron-down"
            onPress={props.onClose}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.bodyContent}
        style={styles.body}
      >
        <TitleBlock
          downloadLabel={props.downloadLabel}
          onEditLoop={
            props.activePlayableItem.loopId
              ? () => {
                  props.onEditActiveLoop(props.activePlayableItem.loopId ?? '');
                }
              : undefined
          }
          summary={summary}
        />

        <NowPlayingTimeline
          activePlayableItem={props.activePlayableItem}
          canSeekActivePlayback={props.canSeekActivePlayback}
          onSeekToPosition={props.onSeekToPosition}
          playbackPositionSeconds={props.playbackPositionSeconds}
          progressRatio={summary.waveformProgressRatio}
        />

        <NowPlayingTransportRow
          canSeekActivePlayback={props.canSeekActivePlayback}
          canSkipNextItem={props.canSkipNextItem}
          canSkipPreviousItem={props.canSkipPreviousItem}
          isPlaybackLoading={props.isPlaybackLoading}
          isPlaybackToggleDisabled={props.isPlaybackToggleDisabled}
          onSeekBackward={props.onSeekBackward}
          onSeekForward={props.onSeekForward}
          onSkipNextItem={props.onSkipNextItem}
          onSkipPreviousItem={props.onSkipPreviousItem}
          onTogglePlayback={props.onTogglePlayback}
          playbackToggleLabel={props.playbackToggleLabel}
          supportsQueueNavigation={summary.supportsQueueNavigation}
          title={summary.title}
        />

        <FadedRule />
        {props.activeRepeatMode ? (
          <PlaybackPracticeRow
            // Repeat and shuffle only change the session, so they stay usable
            // while the current item is still loading (8.33).
            isDisabled={
              props.isPlaybackToggleDisabled && !props.isPlaybackLoading
            }
            onOpenShaping={props.onOpenShaping}
            onSelectQueueMode={props.onSelectQueueMode}
            onSelectRepeatMode={props.onSelectRepeatMode}
            queueMode={props.activeQueueMode}
            repeatMode={props.activeRepeatMode}
            shaping={props.shaping}
          />
        ) : null}
        <PlaybackVolumeRow
          onSetPlaybackVolume={props.onAdjustPlaybackVolume}
          volumeLevel={props.playbackVolumeLevel}
        />
      </ScrollView>
      <OptionsMenuSheet
        actions={menuActions}
        isVisible={isMenuVisible}
        onClose={() => {
          setIsMenuVisible(false);
        }}
        title={summary.title}
      />
    </View>
  );
};
