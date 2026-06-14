import type { PlayableItem } from '@org/audio-library-models';

import type { PlaylistDraftIssue } from '../../../library/playlists/utils/saved-playlist-view-model';
import type { PlaylistPlaybackSession } from '../../../library/playlists/utils/saved-playlist-playback-view-model';
import { PlaybackSurface } from '../../playback/playback-surface';
import type {
  NowPlayingSurfaceSummary,
  UpNextSurfaceSummary,
} from '../shell-model';

type PlaybackSurfaceKey = 'now-playing' | 'queue';

type MobileShellPlaybackSurfaceProps = {
  activePlayableItem: PlayableItem | null;
  activeQueueMode: PlaylistPlaybackSession['queue']['mode'] | null;
  activeRepeatMode: PlaylistPlaybackSession['queue']['repeatMode'] | null;
  canSeekActivePlayback: boolean;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  isPlaybackToggleDisabled: boolean;
  isSavingQueueAsPlaylist: boolean;
  nowPlayingSummary: NowPlayingSurfaceSummary | null;
  onAdjustPlaybackVolume: (volumeLevel: number) => void;
  onClose: () => void;
  onMoveQueueItem: (fromIndex: number, toIndex: number) => void;
  onMoveQueueItemToEnd: (index: number) => void;
  onMoveQueueItemToStart: (index: number) => void;
  onPlayQueueItem: (index: number) => void;
  onRemoveQueueItem: (index: number) => void;
  onSaveQueueAsPlaylist: () => void;
  onUpdateQueuePlaylist: () => Promise<PlaylistDraftIssue | null>;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onSeekToPosition: (positionSeconds: number) => void;
  onSelectQueueMode: (mode: PlaylistPlaybackSession['queue']['mode']) => void;
  onSelectRepeatMode: (
    mode: PlaylistPlaybackSession['queue']['repeatMode'],
  ) => void;
  onShowNowPlaying: () => void;
  onShowQueue: () => void;
  onSkipNextItem: () => void;
  onSkipPreviousItem: () => void;
  onTogglePlayback: () => void;
  playbackPositionSeconds: number;
  playbackToggleLabel: string;
  playbackVolumeLevel: number;
  queueSummary: UpNextSurfaceSummary | null;
  surface: PlaybackSurfaceKey | null;
};

export const MobileShellPlaybackSurface = (
  props: MobileShellPlaybackSurfaceProps,
) => {
  return (
    <PlaybackSurface
      activePlayableItem={props.activePlayableItem}
      activeQueueMode={props.activeQueueMode}
      activeRepeatMode={props.activeRepeatMode}
      canSeekActivePlayback={props.canSeekActivePlayback}
      canSkipNextItem={props.canSkipNextItem}
      canSkipPreviousItem={props.canSkipPreviousItem}
      isPlaybackToggleDisabled={props.isPlaybackToggleDisabled}
      isSavingQueueAsPlaylist={props.isSavingQueueAsPlaylist}
      nowPlayingSummary={props.nowPlayingSummary}
      onAdjustPlaybackVolume={props.onAdjustPlaybackVolume}
      onClose={props.onClose}
      onMoveQueueItem={props.onMoveQueueItem}
      onMoveQueueItemToEnd={props.onMoveQueueItemToEnd}
      onMoveQueueItemToStart={props.onMoveQueueItemToStart}
      onPlayQueueItem={props.onPlayQueueItem}
      onRemoveQueueItem={props.onRemoveQueueItem}
      onSaveQueueAsPlaylist={props.onSaveQueueAsPlaylist}
      onUpdateQueuePlaylist={props.onUpdateQueuePlaylist}
      onSeekBackward={props.onSeekBackward}
      onSeekForward={props.onSeekForward}
      onSeekToPosition={props.onSeekToPosition}
      onSelectQueueMode={props.onSelectQueueMode}
      onSelectRepeatMode={props.onSelectRepeatMode}
      onShowNowPlaying={props.onShowNowPlaying}
      onShowQueue={props.onShowQueue}
      onSkipNextItem={props.onSkipNextItem}
      onSkipPreviousItem={props.onSkipPreviousItem}
      onTogglePlayback={props.onTogglePlayback}
      playbackPositionSeconds={props.playbackPositionSeconds}
      playbackToggleLabel={props.playbackToggleLabel}
      playbackVolumeLevel={props.playbackVolumeLevel}
      queueSummary={props.queueSummary}
      surface={props.surface}
    />
  );
};
