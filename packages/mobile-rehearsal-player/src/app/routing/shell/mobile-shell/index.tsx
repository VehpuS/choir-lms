import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaView, View } from 'react-native';

import { PinnedBulkActionBarHost } from '../../../library/selection/pinned-bulk-action-bar-host';
import { useSavedTrackPlayback } from '../../../library/playback/hooks/use-saved-track-playback';
import type { SavedTrackPlaybackState } from '../../../library/playback/utils/saved-track-playback-view-model';
import type { PlaylistPlaybackSession } from '../../../library/playlists/utils/saved-playlist-playback-view-model';
import type { PlaylistDraftIssue } from '../../../library/playlists/utils/saved-playlist-view-model';
import type { PlaybackShapingControls } from '../../playback/shaping/shaping-surface-model';
import { ShellPracticeDock } from '../../../library/practice-tools/shell-practice-dock';
import { offlineFilesNavigationStore } from '../../../screens/offline-files/offline-files-navigation-store';
import { settingsNavigationStore } from '../../../screens/settings/settings-navigation-store';
import { ShellOverlays } from './shell-overlays';
import { LayoutClassProvider, useWindowLayoutClass } from '../layout-class';
import { ShellTabBar } from '../shell-tab-bar';
import { styles } from '../mobile-shell-styles';
import type { ShellDestinationKey } from '../shell-model';
import { MobileShellDestinationPanels } from './mobile-shell-destination-panels';
import { MobileShellMiniPlayerDock } from './mobile-shell-mini-player-dock';
import { NowPlayingPane } from './now-playing-pane';
import { MobileShellPlaybackSurface } from './mobile-shell-playback-surface';
import { MobileShellQueuePlaylistDialogs } from './mobile-shell-queue-playlist-dialogs';
import { useMobileShellPlaybackSummaries } from './use-mobile-shell-playback-summaries';
import { useMobileShellQueuePlaylistState } from './use-mobile-shell-queue-playlist-state';

type PlaybackSurfaceKey = 'now-playing' | 'queue' | 'shaping';

export type MobileShellProps = {
  activePlayableItem: ReturnType<
    typeof useSavedTrackPlayback
  >['activePlayableItem'];
  activePlaylistSession: PlaylistPlaybackSession | null;
  activeQueueMode: PlaylistPlaybackSession['queue']['mode'] | null;
  activeRepeatMode: PlaylistPlaybackSession['queue']['repeatMode'] | null;
  canShowQueuePlaylistActions: boolean;
  canSeekActivePlayback: boolean;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  requestedDestination?: ShellDestinationKey;
  requestedDestinationRequestId?: number;
  // A render prop (rather than a plain ReactNode like `recentsScreen`) so
  // the Add screen can know when it stops being the active tab and clear
  // stale save-acknowledgment state accordingly, matching `libraryScreen`.
  addScreen: (isActive: boolean) => ReactNode;
  recentsScreen: ReactNode;
  isPlaybackPreparing: boolean;
  isSavingQueueAsPlaylist: boolean;
  isPlaybackToggleDisabled: boolean;
  // A render prop (rather than a plain ReactNode like the other two
  // destinations) so the Library screen can know when it stops being the
  // active tab and clear stale save-acknowledgment state accordingly,
  // without lifting `activeDestination` out of this component.
  libraryScreen: (isActive: boolean) => ReactNode;
  onCloseTagDetail: () => void;
  /** Opens the loop editor for the saved loop with this id. */
  onEditActiveLoop: (loopId: string) => void;
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
  playbackShapingLabel?: string | null;
  playbackShaping: PlaybackShapingControls;
  playbackState: SavedTrackPlaybackState | undefined;
  savedLibraryConfirmationDialog: ReactNode;
};

export const MobileShell = ({
  activePlayableItem,
  activePlaylistSession,
  activeQueueMode,
  activeRepeatMode,
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
  onCloseTagDetail,
  onEditActiveLoop,
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
  playbackShaping,
  playbackShapingLabel = null,
  playbackState,
  savedLibraryConfirmationDialog,
}: MobileShellProps) => {
  const [activeDestination, setActiveDestination] =
    useState<ShellDestinationKey>('library');
  const [activePlaybackSurface, setActivePlaybackSurface] =
    useState<PlaybackSurfaceKey | null>(null);
  const {
    miniPlayerSummary,
    nowPlayingSummary,
    playbackDownloadLabel,
    upNextSummary,
  } = useMobileShellPlaybackSummaries({
    activePlayableItem,
    activePlaylistSession,
    isPlaybackPreparing,
    playbackPositionSeconds,
    playbackShapingLabel,
    playbackState,
  });
  const queuePlaylistState = useMobileShellQueuePlaylistState({
    canShowQueuePlaylistActions,
    hasMiniPlayerSummary: miniPlayerSummary !== null,
    onSaveQueueAsPlaylist,
    onUpdateQueuePlaylist,
  });

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
    // The playback sheet covers every destination, so showing one means
    // collapsing the sheet (composite-tracks 12.8: `Show original track`).
    setActivePlaybackSurface(null);
  }, [requestedDestination, requestedDestinationRequestId]);

  const layoutClass = useWindowLayoutClass();
  const isWideShort = layoutClass === 'wide-short';
  const openNowPlaying = () => {
    setActivePlaybackSurface('now-playing');
  };
  const handleSelectDestination = (destination: ShellDestinationKey) => {
    // Settings covers the destinations, so choosing one leaves it.
    settingsNavigationStore.close();
    offlineFilesNavigationStore.close();
    onCloseTagDetail();
    setActiveDestination(destination);
  };
  // The content, the practice tools and the dock: the whole shell in the
  // compact layout, the column beside the rail in the wide-short one.
  const mainColumn = (
    <>
      <View style={styles.contentViewport}>
        <MobileShellDestinationPanels
          activeDestination={activeDestination}
          addScreen={addScreen}
          libraryScreen={libraryScreen}
          recentsScreen={recentsScreen}
        />
        <ShellOverlays />
      </View>

      <ShellPracticeDock
        activePlayableItem={activePlayableItem}
        isPlaybackSurfaceOpen={activePlaybackSurface !== null}
        playbackPositionSeconds={playbackPositionSeconds}
      />

      <PinnedBulkActionBarHost>
        {isWideShort ? null : (
          <MobileShellMiniPlayerDock
            activeDestination={activeDestination}
            activePlayableItem={activePlayableItem}
            downloadLabel={playbackDownloadLabel}
            isPlaybackLoading={isPlaybackPreparing}
            isPlaybackToggleDisabled={isPlaybackToggleDisabled}
            miniPlayerSummary={miniPlayerSummary}
            onOpenNowPlaying={openNowPlaying}
            onSelectDestination={handleSelectDestination}
            onTogglePlayback={onTogglePlayback}
            playbackState={playbackState}
            playbackToggleLabel={playbackToggleLabel}
          />
        )}
      </PinnedBulkActionBarHost>
    </>
  );

  return (
    <LayoutClassProvider value={layoutClass}>
      <SafeAreaView
        style={[styles.screen, isWideShort ? styles.screenRow : null]}
      >
        {isWideShort ? (
          <ShellTabBar
            activeDestination={activeDestination}
            onSelectDestination={handleSelectDestination}
            orientation="vertical"
          />
        ) : null}
        {isWideShort ? (
          <View style={styles.mainColumn}>{mainColumn}</View>
        ) : (
          mainColumn
        )}
        {isWideShort && miniPlayerSummary ? (
          <NowPlayingPane
            activePlayableItem={activePlayableItem}
            canSkipNextItem={canSkipNextItem}
            canSkipPreviousItem={canSkipPreviousItem}
            downloadLabel={playbackDownloadLabel}
            isPlaybackLoading={isPlaybackPreparing}
            isPlaybackToggleDisabled={isPlaybackToggleDisabled}
            loopLabel={nowPlayingSummary?.loopRange?.label ?? null}
            miniPlayerSummary={miniPlayerSummary}
            onOpenNowPlaying={openNowPlaying}
            onSkipNextItem={onSkipNextItem}
            onSkipPreviousItem={onSkipPreviousItem}
            onTogglePlayback={onTogglePlayback}
            playbackToggleLabel={playbackToggleLabel}
            shapingLabel={nowPlayingSummary?.shapingLabel ?? null}
            supportsQueueNavigation={
              nowPlayingSummary?.supportsQueueNavigation ?? false
            }
          />
        ) : null}

        <MobileShellPlaybackSurface
          activePlayableItem={activePlayableItem}
          activeQueueMode={activeQueueMode}
          activeRepeatMode={activeRepeatMode}
          canSeekActivePlayback={canSeekActivePlayback}
          canSkipNextItem={canSkipNextItem}
          canSkipPreviousItem={canSkipPreviousItem}
          downloadLabel={playbackDownloadLabel}
          isPlaybackLoading={isPlaybackPreparing}
          isPlaybackToggleDisabled={isPlaybackToggleDisabled}
          isSavingQueueAsPlaylist={isSavingQueueAsPlaylist}
          nowPlayingSummary={nowPlayingSummary}
          onAdjustPlaybackVolume={onSetPlaybackVolume}
          onEditActiveLoop={onEditActiveLoop}
          onMoveQueueItem={onMoveQueueItem}
          onMoveQueueItemToEnd={onMoveQueueItemToEnd}
          onMoveQueueItemToStart={onMoveQueueItemToStart}
          onClose={() => {
            setActivePlaybackSurface(null);
            queuePlaylistState.closeQueueDialogs();
          }}
          onPlayQueueItem={onPlayQueueItem}
          onRemoveQueueItem={onRemoveQueueItem}
          onRequestUpdateQueuePlaylist={queuePlaylistState.openUpdateDialog}
          onSeekBackward={onSeekBackward}
          onSeekForward={onSeekForward}
          onSeekToPosition={onSeekToPosition}
          onSaveQueueAsPlaylist={() => {
            queuePlaylistState.openSaveDialog();
          }}
          onSelectQueueMode={onSelectQueueMode}
          onSelectRepeatMode={onSelectRepeatMode}
          onShowNowPlaying={() => {
            setActivePlaybackSurface('now-playing');
          }}
          onShowQueue={() => {
            setActivePlaybackSurface('queue');
          }}
          onShowShaping={() => {
            setActivePlaybackSurface('shaping');
          }}
          onSkipNextItem={onSkipNextItem}
          onSkipPreviousItem={onSkipPreviousItem}
          onTogglePlayback={onTogglePlayback}
          playbackPositionSeconds={playbackPositionSeconds}
          playbackToggleLabel={playbackToggleLabel}
          playbackVolumeLevel={playbackVolumeLevel}
          queueSummary={upNextSummary}
          shaping={playbackShaping}
          surface={activePlaybackSurface}
        />

        <MobileShellQueuePlaylistDialogs
          isMutating={isSavingQueueAsPlaylist}
          state={queuePlaylistState}
        />

        {savedLibraryConfirmationDialog}
      </SafeAreaView>
    </LayoutClassProvider>
  );
};
