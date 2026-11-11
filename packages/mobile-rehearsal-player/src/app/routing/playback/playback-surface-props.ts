import type {
  PlayableItem,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import type { ComponentProps } from 'react';
import type { View } from 'react-native';

import type {
  NowPlayingSurfaceSummary,
  UpNextSurfaceSummary,
} from '../shell/shell-model';
import type { PlaybackShapingControls } from './shaping/shaping-surface-model';

export type PlaybackSurfaceMode = 'now-playing' | 'queue' | 'shaping';

export type PlaybackSurfaceProps = {
  activePlayableItem: PlayableItem | null;
  activeQueueMode: RehearsalQueueMode | null;
  activeRepeatMode: RepeatMode | null;
  canSeekActivePlayback: boolean;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  downloadLabel: string | null;
  isPlaybackLoading: boolean;
  isPlaybackToggleDisabled: boolean;
  isSavingQueueAsPlaylist: boolean;
  nowPlayingSummary: NowPlayingSurfaceSummary | null;
  onAdjustPlaybackVolume: (volumeLevel: number) => void;
  onMoveQueueItem: (fromIndex: number, toIndex: number) => void;
  onMoveQueueItemToEnd: (index: number) => void;
  onMoveQueueItemToStart: (index: number) => void;
  onClose: () => void;
  onEditActiveLoop: (loopId: string) => void;
  onPlayQueueItem: (index: number) => void;
  onRemoveQueueItem: (index: number) => void;
  onRequestUpdateQueuePlaylist: (
    action: NonNullable<
      NonNullable<UpNextSurfaceSummary['queuePlaylistActions']>['updateAction']
    >,
  ) => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onSeekToPosition: (positionSeconds: number) => void;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSaveQueueAsPlaylist: () => void;
  onSelectRepeatMode: (mode: RepeatMode) => void;
  onShowNowPlaying: () => void;
  onShowQueue: () => void;
  onShowShaping: () => void;
  onSkipNextItem: () => void;
  onSkipPreviousItem: () => void;
  onTogglePlayback: () => void;
  playbackPositionSeconds: number;
  playbackToggleLabel: string;
  playbackVolumeLevel: number;
  queueSummary: UpNextSurfaceSummary | null;
  shaping: PlaybackShapingControls;
  surface: PlaybackSurfaceMode | null;
};

/**
 * What a layout's content needs: the surface's props with the close action
 * replaced by the sheet's animated dismissal, and the handle that lets a drag
 * on the queue's header dismiss the sheet.
 */
export type PlaybackContentProps = PlaybackSurfaceProps & {
  dragHandleProps?: ComponentProps<typeof View>;
};
