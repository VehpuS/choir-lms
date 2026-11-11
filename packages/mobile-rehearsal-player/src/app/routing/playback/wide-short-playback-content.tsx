import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { QueueSurface } from '../queue/queue-surface';
import { appTheme } from '../../utils/theme';
import { NowPlayingSurface } from './now-playing';
import {
  getPlaybackTabs,
  getPlaybackTabTarget,
  getSelectedPlaybackTab,
  type NowPlayingTabKey,
  type PlaybackTabKey,
} from './playback-tabs-model';
import type { PlaybackContentProps } from './playback-surface-props';
import { PlaybackTabsPane } from './playback-tabs-pane';
import { ShapingSurface } from './shaping/shaping-surface';

const { colors, elevation, radius } = appTheme;

/**
 * The wide-short layout's playback view: one sheet in two columns. The left
 * keeps what you play with (status and actions, title, waveform, transport,
 * speed and pitch, volume); the right shows one panel at a time (Lyrics, a
 * composite's Mix, the queue, speed & pitch), so changing panel never moves
 * the transport. `surface` still says which panel is open, so everything that
 * asks for the queue or the shaping surface lands on its tab.
 */
export const WideShortPlaybackContent = (props: PlaybackContentProps) => {
  const { activePlayableItem, nowPlayingSummary, queueSummary, surface } =
    props;
  const [nowPlayingTab, setNowPlayingTab] =
    useState<NowPlayingTabKey>('lyrics');

  if (!surface || !activePlayableItem || !nowPlayingSummary) {
    return null;
  }

  const tabs = getPlaybackTabs({
    hasQueue:
      nowPlayingSummary.supportsQueueNavigation && queueSummary !== null,
    isComposite: activePlayableItem.kind === 'composite',
  });
  const selectedTab = getSelectedPlaybackTab({ nowPlayingTab, surface, tabs });
  const selectTab = (key: PlaybackTabKey) => {
    const target = getPlaybackTabTarget(key);

    if (target.nowPlayingTab) {
      setNowPlayingTab(target.nowPlayingTab);
    }

    if (target.surface === 'queue') {
      props.onShowQueue();
    } else if (target.surface === 'shaping') {
      props.onShowShaping();
    } else {
      props.onShowNowPlaying();
    }
  };

  return (
    <View style={styles.sheet}>
      <NowPlayingSurface
        activePlayableItem={activePlayableItem}
        activeQueueMode={props.activeQueueMode}
        activeRepeatMode={props.activeRepeatMode}
        canSeekActivePlayback={props.canSeekActivePlayback}
        canSkipNextItem={props.canSkipNextItem}
        canSkipPreviousItem={props.canSkipPreviousItem}
        downloadLabel={props.downloadLabel}
        isPlaybackLoading={props.isPlaybackLoading}
        isPlaybackToggleDisabled={props.isPlaybackToggleDisabled}
        layout="column"
        onAdjustPlaybackVolume={props.onAdjustPlaybackVolume}
        onClose={props.onClose}
        onEditActiveLoop={props.onEditActiveLoop}
        onOpenShaping={() => {
          selectTab('shaping');
        }}
        onSeekBackward={props.onSeekBackward}
        onSeekForward={props.onSeekForward}
        onSeekToPosition={props.onSeekToPosition}
        onSelectQueueMode={props.onSelectQueueMode}
        onSelectRepeatMode={props.onSelectRepeatMode}
        onShowQueue={props.onShowQueue}
        onSkipNextItem={props.onSkipNextItem}
        onSkipPreviousItem={props.onSkipPreviousItem}
        onTogglePlayback={props.onTogglePlayback}
        playbackPositionSeconds={props.playbackPositionSeconds}
        playbackToggleLabel={props.playbackToggleLabel}
        playbackVolumeLevel={props.playbackVolumeLevel}
        queueSummary={queueSummary}
        shaping={props.shaping}
        summary={nowPlayingSummary}
      />
      <PlaybackTabsPane
        activePlayableItem={activePlayableItem}
        onSelectTab={selectTab}
        queueContent={
          queueSummary ? (
            <QueueSurface
              activeQueueMode={props.activeQueueMode ?? 'ordered'}
              activeRepeatMode={props.activeRepeatMode ?? 'off'}
              embedded
              isPlaybackLoading={props.isPlaybackLoading}
              isPlaybackToggleDisabled={props.isPlaybackToggleDisabled}
              isSavingQueueAsPlaylist={props.isSavingQueueAsPlaylist}
              onClose={props.onClose}
              onMoveQueueItem={props.onMoveQueueItem}
              onMoveQueueItemToEnd={props.onMoveQueueItemToEnd}
              onMoveQueueItemToStart={props.onMoveQueueItemToStart}
              onPlayQueueItem={props.onPlayQueueItem}
              onRemoveQueueItem={props.onRemoveQueueItem}
              onRequestUpdateQueuePlaylist={props.onRequestUpdateQueuePlaylist}
              onSaveQueueAsPlaylist={props.onSaveQueueAsPlaylist}
              onSelectQueueMode={props.onSelectQueueMode}
              onSelectRepeatMode={props.onSelectRepeatMode}
              onShowNowPlaying={props.onShowNowPlaying}
              onTogglePlayback={props.onTogglePlayback}
              playbackToggleLabel={props.playbackToggleLabel}
              summary={queueSummary}
            />
          ) : null
        }
        selectedTab={selectedTab}
        shapingContent={
          <ShapingSurface
            controls={props.shaping}
            embedded
            onClose={props.onShowNowPlaying}
            summary={nowPlayingSummary}
          />
        }
        tabs={tabs}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // The sheet of the compact layout, wide: the two columns share its height.
  sheet: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.bg,
    ...elevation.sheet,
  },
});
