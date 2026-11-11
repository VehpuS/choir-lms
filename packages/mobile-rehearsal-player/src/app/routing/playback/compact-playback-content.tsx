import { NowPlayingSurface } from './now-playing';
import type { PlaybackContentProps } from './playback-surface-props';
import { QueueSurface } from '../queue/queue-surface';
import { ShapingSurface } from './shaping/shaping-surface';

/**
 * The compact layout's playback sheet: the one of Now Playing, Up next and
 * Speed & pitch that `surface` names, each as its own bottom sheet.
 */
export const CompactPlaybackContent = ({
  activePlayableItem,
  activeQueueMode,
  activeRepeatMode,
  canSeekActivePlayback,
  canSkipNextItem,
  canSkipPreviousItem,
  dragHandleProps,
  downloadLabel,
  isPlaybackLoading,
  isPlaybackToggleDisabled,
  isSavingQueueAsPlaylist,
  nowPlayingSummary,
  onAdjustPlaybackVolume,
  onClose,
  onEditActiveLoop,
  onMoveQueueItem,
  onMoveQueueItemToEnd,
  onMoveQueueItemToStart,
  onPlayQueueItem,
  onRemoveQueueItem,
  onRequestUpdateQueuePlaylist,
  onSaveQueueAsPlaylist,
  onSeekBackward,
  onSeekForward,
  onSeekToPosition,
  onSelectQueueMode,
  onSelectRepeatMode,
  onShowNowPlaying,
  onShowQueue,
  onShowShaping,
  onSkipNextItem,
  onSkipPreviousItem,
  onTogglePlayback,
  playbackPositionSeconds,
  playbackToggleLabel,
  playbackVolumeLevel,
  queueSummary,
  shaping,
  surface,
}: PlaybackContentProps) => {
  const canRenderQueue = surface === 'queue' && queueSummary;
  const canRenderNowPlaying = surface === 'now-playing' && nowPlayingSummary;
  const canRenderShaping = surface === 'shaping' && nowPlayingSummary;

  return (
    <>
      {canRenderQueue && queueSummary ? (
        <QueueSurface
          activeQueueMode={activeQueueMode ?? 'ordered'}
          dragHandleProps={dragHandleProps}
          activeRepeatMode={activeRepeatMode ?? 'off'}
          isSavingQueueAsPlaylist={isSavingQueueAsPlaylist}
          isPlaybackLoading={isPlaybackLoading}
          isPlaybackToggleDisabled={isPlaybackToggleDisabled}
          onClose={onClose}
          onMoveQueueItem={onMoveQueueItem}
          onMoveQueueItemToEnd={onMoveQueueItemToEnd}
          onMoveQueueItemToStart={onMoveQueueItemToStart}
          onPlayQueueItem={onPlayQueueItem}
          onRemoveQueueItem={onRemoveQueueItem}
          onRequestUpdateQueuePlaylist={onRequestUpdateQueuePlaylist}
          onSaveQueueAsPlaylist={onSaveQueueAsPlaylist}
          onSelectQueueMode={onSelectQueueMode}
          onSelectRepeatMode={onSelectRepeatMode}
          onShowNowPlaying={onShowNowPlaying}
          onTogglePlayback={onTogglePlayback}
          playbackToggleLabel={playbackToggleLabel}
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
          downloadLabel={downloadLabel}
          isPlaybackLoading={isPlaybackLoading}
          isPlaybackToggleDisabled={isPlaybackToggleDisabled}
          onAdjustPlaybackVolume={onAdjustPlaybackVolume}
          onClose={onClose}
          onEditActiveLoop={onEditActiveLoop}
          onSeekBackward={onSeekBackward}
          onSeekForward={onSeekForward}
          onSeekToPosition={onSeekToPosition}
          onSelectQueueMode={onSelectQueueMode}
          onSelectRepeatMode={onSelectRepeatMode}
          onOpenShaping={onShowShaping}
          onShowQueue={onShowQueue}
          onSkipNextItem={onSkipNextItem}
          onSkipPreviousItem={onSkipPreviousItem}
          onTogglePlayback={onTogglePlayback}
          playbackPositionSeconds={playbackPositionSeconds}
          playbackToggleLabel={playbackToggleLabel}
          playbackVolumeLevel={playbackVolumeLevel}
          queueSummary={queueSummary}
          shaping={shaping}
          summary={nowPlayingSummary}
        />
      ) : null}
      {canRenderShaping && nowPlayingSummary ? (
        <ShapingSurface
          controls={shaping}
          onClose={onShowNowPlaying}
          summary={nowPlayingSummary}
        />
      ) : null}
    </>
  );
};
