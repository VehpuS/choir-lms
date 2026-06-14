import type { Playlist } from '@org/audio-library-models';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, SafeAreaView, View } from 'react-native';

import { useGoogleDriveAuthorization } from '../../../auth/google-drive/hooks/use-authorization';
import { useSavedTrackPlayback } from '../../../library/playback/hooks/use-saved-track-playback';
import type { SavedTrackPlaybackState } from '../../../library/playback/utils/saved-track-playback-view-model';
import type { PlaylistPlaybackSession } from '../../../library/playlists/utils/saved-playlist-playback-view-model';
import type { PlaylistDraftIssue } from '../../../library/playlists/utils/saved-playlist-view-model';
import { styles } from '../mobile-shell-styles';
import {
  SHELL_DESTINATIONS,
  getMiniPlayerSummary,
  getNowPlayingSurfaceSummary,
  getUpNextSurfaceSummary,
  type ShellDestinationKey,
} from '../shell-model';
import { MobileShellHeaderCard } from './mobile-shell-header-card';
import { MobileShellMiniPlayerDock } from './mobile-shell-mini-player-dock';
import { MobileShellPlaybackSurface } from './mobile-shell-playback-surface';
import { MobileShellQueuePlaylistDialogs } from './mobile-shell-queue-playlist-dialogs';
import { useMobileShellQueuePlaylistState } from './use-mobile-shell-queue-playlist-state';

type PlaybackSurfaceKey = 'now-playing' | 'queue';

export type MobileShellProps = {
  activePlayableItem: ReturnType<
    typeof useSavedTrackPlayback
  >['activePlayableItem'];
  activePlaylistSession: PlaylistPlaybackSession | null;
  activeQueueMode: PlaylistPlaybackSession['queue']['mode'] | null;
  activeRepeatMode: PlaylistPlaybackSession['queue']['repeatMode'] | null;
  authorization: ReturnType<typeof useGoogleDriveAuthorization>;
  canShowQueuePlaylistActions: boolean;
  canSeekActivePlayback: boolean;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  requestedDestination?: ShellDestinationKey;
  requestedDestinationRequestId?: number;
  addScreen: ReactNode;
  recentsScreen: ReactNode;
  isPlaybackPreparing: boolean;
  isSavingQueueAsPlaylist: boolean;
  isPlaybackToggleDisabled: boolean;
  libraryScreen: ReactNode;
  onMoveQueueItem: (fromIndex: number, toIndex: number) => void;
  onMoveQueueItemToEnd: (index: number) => void;
  onMoveQueueItemToStart: (index: number) => void;
  onPlayQueueItem: (index: number) => void;
  onRemoveQueueItem: (index: number) => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onSeekToPosition: (positionSeconds: number) => void;
  onSaveQueueAsPlaylist: (name: string) => Promise<PlaylistDraftIssue | null>;
  onUpdateQueuePlaylist: () => Promise<PlaylistDraftIssue | null>;
  onSelectQueueMode: (mode: PlaylistPlaybackSession['queue']['mode']) => void;
  onSelectRepeatMode: (
    mode: PlaylistPlaybackSession['queue']['repeatMode'],
  ) => void;
  onSetPlaybackVolume: (volumeLevel: number) => void;
  onSkipNextItem: () => void;
  onSkipPreviousItem: () => void;
  onTogglePlayback: () => void;
  playbackPositionSeconds: number;
  playbackToggleLabel: string;
  playbackVolumeLevel: number;
  playbackState: SavedTrackPlaybackState | undefined;
};

const PANEL_BY_DESTINATION: Record<
  ShellDestinationKey,
  keyof Pick<MobileShellProps, 'recentsScreen' | 'libraryScreen' | 'addScreen'>
> = {
  recents: 'recentsScreen',
  add: 'addScreen',
  library: 'libraryScreen',
};

export const MobileShell = ({
  activePlayableItem,
  activePlaylistSession,
  activeQueueMode,
  activeRepeatMode,
  authorization,
  canShowQueuePlaylistActions,
  canSeekActivePlayback,
  canSkipNextItem,
  canSkipPreviousItem,
  requestedDestination,
  requestedDestinationRequestId,
  addScreen,
  recentsScreen,
  isPlaybackPreparing,
  isSavingQueueAsPlaylist,
  isPlaybackToggleDisabled,
  libraryScreen,
  onMoveQueueItem,
  onMoveQueueItemToEnd,
  onMoveQueueItemToStart,
  onPlayQueueItem,
  onRemoveQueueItem,
  onSeekBackward,
  onSeekForward,
  onSeekToPosition,
  onSaveQueueAsPlaylist,
  onUpdateQueuePlaylist,
  onSelectQueueMode,
  onSelectRepeatMode,
  onSetPlaybackVolume,
  onSkipNextItem,
  onSkipPreviousItem,
  onTogglePlayback,
  playbackPositionSeconds,
  playbackToggleLabel,
  playbackVolumeLevel,
  playbackState,
}: MobileShellProps) => {
  const [activeDestination, setActiveDestination] =
    useState<ShellDestinationKey>('library');
  const [activePlaybackSurface, setActivePlaybackSurface] =
    useState<PlaybackSurfaceKey | null>(null);
  const [isSessionMenuVisible, setIsSessionMenuVisible] = useState(false);
  const miniPlayerSummary = getMiniPlayerSummary({
    activePlayableItem,
    activePlaylistSession,
    isPlaybackPreparing,
    playbackPositionSeconds,
    playbackState,
  });
  const nowPlayingSummary = getNowPlayingSurfaceSummary({
    activePlayableItem,
    activePlaylistSession,
    isPlaybackPreparing,
    playbackPositionSeconds,
    playbackState,
  });
  const upNextSummary = getUpNextSurfaceSummary({
    activePlaylistSession,
  });
  const queuePlaylistState = useMobileShellQueuePlaylistState({
    canShowQueuePlaylistActions,
    hasMiniPlayerSummary: miniPlayerSummary !== null,
    onSaveQueueAsPlaylist,
  });
  const activeDestinationConfig =
    SHELL_DESTINATIONS.find(
      (destination) => destination.key === activeDestination,
    ) ?? SHELL_DESTINATIONS[0];

  useEffect(() => {
    if (!miniPlayerSummary) {
      setActivePlaybackSurface(null);
    }
  }, [miniPlayerSummary]);

  useEffect(() => {
    if (!requestedDestination || requestedDestinationRequestId === undefined) {
      return;
    }

    setActiveDestination(requestedDestination);
  }, [requestedDestination, requestedDestinationRequestId]);

  return (
    <SafeAreaView style={styles.screen}>
      {isSessionMenuVisible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setIsSessionMenuVisible(false);
          }}
          style={styles.menuBackdrop}
        />
      ) : null}

      <MobileShellHeaderCard
        activeDestinationDescription={activeDestinationConfig.description}
        activeDestinationLabel={activeDestinationConfig.label}
        activeDestinationTitle={activeDestinationConfig.title}
        authorization={authorization}
        isSessionMenuVisible={isSessionMenuVisible}
        onClearAuthorization={() => {
          setIsSessionMenuVisible(false);
          void authorization.clearAuthorization();
        }}
        onStartAuthorization={() => {
          setIsSessionMenuVisible(false);
          void authorization.startAuthorization();
        }}
        onToggleSessionMenu={() => {
          setIsSessionMenuVisible((currentValue) => !currentValue);
          setActivePlaybackSurface(null);
          queuePlaylistState.closeQueueDialogs();
        }}
      />

      <View style={styles.contentViewport}>
        {SHELL_DESTINATIONS.map((destination) => {
          const panelKey = PANEL_BY_DESTINATION[destination.key];
          const panel = {
            addScreen,
            recentsScreen,
            libraryScreen,
          }[panelKey];

          return (
            <View
              key={destination.key}
              style={[
                styles.destinationPanel,
                activeDestination === destination.key
                  ? styles.destinationPanelActive
                  : styles.destinationPanelHidden,
              ]}
            >
              {panel}
            </View>
          );
        })}
      </View>

      <MobileShellMiniPlayerDock
        activeDestination={activeDestination}
        activePlayableItem={activePlayableItem}
        isPlaybackToggleDisabled={isPlaybackToggleDisabled}
        miniPlayerSummary={miniPlayerSummary}
        onOpenNowPlaying={() => {
          setActivePlaybackSurface('now-playing');
          setIsSessionMenuVisible(false);
        }}
        onSelectDestination={(destination) => {
          setIsSessionMenuVisible(false);
          setActiveDestination(destination);
        }}
        onTogglePlayback={onTogglePlayback}
        playbackState={playbackState}
        playbackToggleLabel={playbackToggleLabel}
      />

      <MobileShellPlaybackSurface
        activePlayableItem={activePlayableItem}
        activeQueueMode={activeQueueMode}
        activeRepeatMode={activeRepeatMode}
        canSeekActivePlayback={canSeekActivePlayback}
        canSkipNextItem={canSkipNextItem}
        canSkipPreviousItem={canSkipPreviousItem}
        isPlaybackToggleDisabled={isPlaybackToggleDisabled}
        isSavingQueueAsPlaylist={isSavingQueueAsPlaylist}
        nowPlayingSummary={nowPlayingSummary}
        onAdjustPlaybackVolume={onSetPlaybackVolume}
        onMoveQueueItem={onMoveQueueItem}
        onMoveQueueItemToEnd={onMoveQueueItemToEnd}
        onMoveQueueItemToStart={onMoveQueueItemToStart}
        onClose={() => {
          setActivePlaybackSurface(null);
          queuePlaylistState.closeQueueDialogs();
        }}
        onPlayQueueItem={onPlayQueueItem}
        onRemoveQueueItem={onRemoveQueueItem}
        onSeekBackward={onSeekBackward}
        onSeekForward={onSeekForward}
        onSeekToPosition={onSeekToPosition}
        onSaveQueueAsPlaylist={() => {
          queuePlaylistState.openSaveDialog();
        }}
        onUpdateQueuePlaylist={onUpdateQueuePlaylist}
        onSelectQueueMode={onSelectQueueMode}
        onSelectRepeatMode={onSelectRepeatMode}
        onShowNowPlaying={() => {
          setActivePlaybackSurface('now-playing');
        }}
        onShowQueue={() => {
          setActivePlaybackSurface('queue');
        }}
        onSkipNextItem={onSkipNextItem}
        onSkipPreviousItem={onSkipPreviousItem}
        onTogglePlayback={onTogglePlayback}
        playbackPositionSeconds={playbackPositionSeconds}
        playbackToggleLabel={playbackToggleLabel}
        playbackVolumeLevel={playbackVolumeLevel}
        queueSummary={upNextSummary}
        surface={activePlaybackSurface}
      />

      <MobileShellQueuePlaylistDialogs
        isMutating={isSavingQueueAsPlaylist}
        isSaveDialogVisible={queuePlaylistState.isSaveDialogVisible}
        issue={queuePlaylistState.issue}
        onCancelSave={queuePlaylistState.closeSaveDialog}
        onChangeDraftName={queuePlaylistState.onDraftNameChange}
        onSubmitSave={() => {
          void (async () => {
            await queuePlaylistState.submitSave();
          })();
        }}
        queuePlaylistDraftName={queuePlaylistState.queuePlaylistDraftName}
      />
    </SafeAreaView>
  );
};
