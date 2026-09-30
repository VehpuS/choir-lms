import type {
  PlayableItem,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import { ScrollView, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { FadedRule } from '../../../components/faded-rule';
import { SurfaceIconButton } from '../../../components/surface-icon-button';
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
import { nowPlayingStyles as styles } from './styles';
import { NowPlayingTransportRow } from './now-playing-transport-row';

const LOOP_CHIP_ICON_SIZE = 16;

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

const LoopRangeChip = ({
  loopRange,
}: {
  loopRange: NonNullable<NowPlayingSurfaceSummary['loopRange']>;
}) => {
  return (
    <View
      accessibilityLabel={loopRange.accessibilityLabel}
      accessible
      style={styles.loopChip}
    >
      <AppIcon
        color={appTheme.colors.accentText}
        name="repeat"
        size={LOOP_CHIP_ICON_SIZE}
      />
      <Text style={styles.loopChipText}>{loopRange.label}</Text>
    </View>
  );
};

const TitleBlock = ({ summary }: { summary: NowPlayingSurfaceSummary }) => {
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.statusKicker}>{summary.statusLabel}</Text>
      <Text numberOfLines={2} style={styles.title}>
        {summary.title}
      </Text>
      <Text numberOfLines={1} style={styles.contextText}>
        {summary.collectionLabel}
      </Text>
      {summary.upNextLabel ? (
        <Text numberOfLines={1} style={styles.nextText}>
          Next · {summary.upNextLabel}
        </Text>
      ) : null}
      {summary.loopRange ? (
        <LoopRangeChip loopRange={summary.loopRange} />
      ) : null}
    </View>
  );
};

export const NowPlayingSurface = (props: NowPlayingSurfaceProps) => {
  const { summary } = props;

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
        <TitleBlock summary={summary} />

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
            isDisabled={props.isPlaybackToggleDisabled}
            onSelectQueueMode={props.onSelectQueueMode}
            onSelectRepeatMode={props.onSelectRepeatMode}
            queueMode={props.activeQueueMode}
            repeatMode={props.activeRepeatMode}
          />
        ) : null}
        <PlaybackVolumeRow
          onSetPlaybackVolume={props.onAdjustPlaybackVolume}
          volumeLevel={props.playbackVolumeLevel}
        />
      </ScrollView>
    </View>
  );
};
