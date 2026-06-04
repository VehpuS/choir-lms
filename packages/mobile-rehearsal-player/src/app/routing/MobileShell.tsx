import type { Playlist } from '@org/audio-library-models';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';

import { DriveSessionMenu } from '../auth/components/DriveSessionMenu';
import { useGoogleDriveAuthorization } from '../auth/hooks/use-google-drive-authorization';
import { useSavedTrackPlayback } from '../library/hooks/use-saved-track-playback';
import type { PlaylistDraftIssue } from '../library/utils/saved-playlist-view-model';
import type { PlaylistPlaybackSession } from '../library/utils/saved-playlist-playback-view-model';
import type { SavedTrackPlaybackState } from '../library/utils/saved-track-playback-view-model';
import { PlaybackMarqueeText } from './PlaybackMarqueeText';
import { PlaybackSurface } from './PlaybackSurface';
import { PlaybackWaveform } from './PlaybackWaveform';
import { QueuePlaylistAppendDialog } from './QueuePlaylistAppendDialog';
import { QueuePlaylistSaveDialog } from './QueuePlaylistSaveDialog';
import { ShellTabBar } from './ShellTabBar';
import { styles } from './mobile-shell-styles';
import {
  SHELL_DESTINATIONS,
  getMiniPlayerSummary,
  getNowPlayingSurfaceSummary,
  getUpNextSurfaceSummary,
  type ShellDestinationKey,
} from './shell-model';

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
  onAppendQueueToPlaylist: (
    playlistId: string,
  ) => Promise<PlaylistDraftIssue | null>;
  onMoveQueueItem: (fromIndex: number, toIndex: number) => void;
  onMoveQueueItemToEnd: (index: number) => void;
  onMoveQueueItemToStart: (index: number) => void;
  onPlayQueueItem: (index: number) => void;
  onRemoveQueueItem: (index: number) => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onSeekToPosition: (positionSeconds: number) => void;
  onSaveQueueAsPlaylist: (name: string) => Promise<PlaylistDraftIssue | null>;
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
  queuePlaylistTargets: Playlist[];
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
  onAppendQueueToPlaylist,
  onMoveQueueItem,
  onMoveQueueItemToEnd,
  onMoveQueueItemToStart,
  onPlayQueueItem,
  onRemoveQueueItem,
  onSeekBackward,
  onSeekForward,
  onSeekToPosition,
  onSaveQueueAsPlaylist,
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
  queuePlaylistTargets,
}: MobileShellProps) => {
  const [activeDestination, setActiveDestination] =
    useState<ShellDestinationKey>('library');
  const [activePlaybackSurface, setActivePlaybackSurface] =
    useState<PlaybackSurfaceKey | null>(null);
  const [isQueuePlaylistDialogVisible, setIsQueuePlaylistDialogVisible] =
    useState(false);
  const [
    isQueuePlaylistAppendDialogVisible,
    setIsQueuePlaylistAppendDialogVisible,
  ] = useState(false);
  const [queuePlaylistDraftName, setQueuePlaylistDraftName] = useState('');
  const [queuePlaylistIssue, setQueuePlaylistIssue] =
    useState<PlaylistDraftIssue | null>(null);
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
  const activeDestinationConfig =
    SHELL_DESTINATIONS.find(
      (destination) => destination.key === activeDestination,
    ) ?? SHELL_DESTINATIONS[0];

  useEffect(() => {
    if (!miniPlayerSummary) {
      setActivePlaybackSurface(null);
      setIsQueuePlaylistDialogVisible(false);
      setIsQueuePlaylistAppendDialogVisible(false);
      setQueuePlaylistDraftName('');
      setQueuePlaylistIssue(null);
    }
  }, [miniPlayerSummary]);

  useEffect(() => {
    if (canShowQueuePlaylistActions) {
      return;
    }

    setIsQueuePlaylistDialogVisible(false);
    setIsQueuePlaylistAppendDialogVisible(false);
    setQueuePlaylistDraftName('');
    setQueuePlaylistIssue(null);
  }, [canShowQueuePlaylistActions]);

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

      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerLabel} testID="active-destination-label">
            {activeDestinationConfig.label}
          </Text>
          <DriveSessionMenu
            authState={authorization.authState}
            canClearAuthorization={authorization.canClearAuthorization}
            canStartAuthorization={authorization.canStartAuthorization}
            isBusy={authorization.isBusy}
            isVisible={isSessionMenuVisible}
            onClearAuthorization={() => {
              setIsSessionMenuVisible(false);
              void authorization.clearAuthorization();
            }}
            onStartAuthorization={() => {
              setIsSessionMenuVisible(false);
              void authorization.startAuthorization();
            }}
            onToggleVisibility={() => {
              setIsSessionMenuVisible((currentValue) => !currentValue);
              setActivePlaybackSurface(null);
              setIsQueuePlaylistDialogVisible(false);
              setIsQueuePlaylistAppendDialogVisible(false);
            }}
            requestReady={authorization.requestReady}
            statusCopy={authorization.statusCopy}
          />
        </View>
        <Text style={styles.headerTitle} testID="active-destination-title">
          {activeDestinationConfig.title}
        </Text>
        <Text style={styles.headerBody}>
          {activeDestinationConfig.description}
        </Text>
      </View>

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

      <View
        style={[
          styles.bottomDock,
          !miniPlayerSummary ? styles.bottomDockTabsOnly : null,
        ]}
      >
        {miniPlayerSummary ? (
          <View style={styles.miniPlayer}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setActivePlaybackSurface('now-playing');
                setIsSessionMenuVisible(false);
              }}
              style={({ pressed }) => [
                styles.miniPlayerBody,
                pressed ? styles.miniPlayerPressed : null,
              ]}
              testID="mini-player"
            >
              {activePlayableItem ? (
                <PlaybackWaveform
                  activePlayableItem={activePlayableItem}
                  appearance="dark"
                  progressRatio={miniPlayerSummary.waveformProgressRatio}
                  style={styles.miniPlayerWaveform}
                  variant="compact"
                />
              ) : null}
              <View style={styles.miniPlayerCopy}>
                <Text style={styles.miniPlayerLabel}>Now playing</Text>
                <PlaybackMarqueeText
                  containerStyle={styles.miniPlayerTitleWrap}
                  enabled={playbackState === 'playing'}
                  style={styles.miniPlayerTitle}
                  text={miniPlayerSummary.title}
                />
                <Text numberOfLines={1} style={styles.miniPlayerStatus}>
                  {miniPlayerSummary.status}
                </Text>
                <Text numberOfLines={1} style={styles.miniPlayerDetail}>
                  {miniPlayerSummary.detail}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityLabel={playbackToggleLabel}
              accessibilityRole="button"
              disabled={isPlaybackToggleDisabled}
              onPress={onTogglePlayback}
              style={({ pressed }) => [
                styles.miniPlayerActionButton,
                pressed && !isPlaybackToggleDisabled
                  ? styles.miniPlayerPressed
                  : null,
                isPlaybackToggleDisabled
                  ? styles.miniPlayerActionDisabled
                  : null,
              ]}
            >
              <MaterialCommunityIcons
                color="#fff8ef"
                name={playbackToggleLabel === 'Pause' ? 'pause' : 'play'}
                size={24}
              />
            </Pressable>
          </View>
        ) : null}
        <ShellTabBar
          activeDestination={activeDestination}
          onSelectDestination={(destination) => {
            setIsSessionMenuVisible(false);
            setActiveDestination(destination);
          }}
        />
      </View>

      <PlaybackSurface
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
        onAppendQueueToPlaylist={() => {
          setQueuePlaylistIssue(null);
          setIsQueuePlaylistDialogVisible(false);
          setIsQueuePlaylistAppendDialogVisible(true);
        }}
        onMoveQueueItem={onMoveQueueItem}
        onMoveQueueItemToEnd={onMoveQueueItemToEnd}
        onMoveQueueItemToStart={onMoveQueueItemToStart}
        onClose={() => {
          setActivePlaybackSurface(null);
          setIsQueuePlaylistDialogVisible(false);
          setIsQueuePlaylistAppendDialogVisible(false);
          setQueuePlaylistIssue(null);
        }}
        onPlayQueueItem={onPlayQueueItem}
        onRemoveQueueItem={onRemoveQueueItem}
        onSeekBackward={onSeekBackward}
        onSeekForward={onSeekForward}
        onSeekToPosition={onSeekToPosition}
        onSaveQueueAsPlaylist={() => {
          setQueuePlaylistIssue(null);
          setIsQueuePlaylistAppendDialogVisible(false);
          setIsQueuePlaylistDialogVisible(true);
        }}
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

      <QueuePlaylistSaveDialog
        isMutating={isSavingQueueAsPlaylist}
        isVisible={isQueuePlaylistDialogVisible}
        issue={queuePlaylistIssue}
        onCancel={() => {
          setIsQueuePlaylistDialogVisible(false);
          setQueuePlaylistIssue(null);
        }}
        onChange={(value) => {
          setQueuePlaylistDraftName(value);
          setQueuePlaylistIssue(null);
        }}
        onSubmit={() => {
          void (async () => {
            const issue = await onSaveQueueAsPlaylist(queuePlaylistDraftName);

            if (issue) {
              setQueuePlaylistIssue(issue);
              return;
            }

            setIsQueuePlaylistDialogVisible(false);
            setQueuePlaylistDraftName('');
            setQueuePlaylistIssue(null);
          })();
        }}
        value={queuePlaylistDraftName}
      />

      <QueuePlaylistAppendDialog
        isMutating={isSavingQueueAsPlaylist}
        isVisible={isQueuePlaylistAppendDialogVisible}
        issue={queuePlaylistIssue}
        onCancel={() => {
          setIsQueuePlaylistAppendDialogVisible(false);
          setQueuePlaylistIssue(null);
        }}
        onSelectPlaylist={(playlistId) => {
          void (async () => {
            const issue = await onAppendQueueToPlaylist(playlistId);

            if (issue) {
              setQueuePlaylistIssue(issue);
              return;
            }

            setIsQueuePlaylistAppendDialogVisible(false);
            setQueuePlaylistIssue(null);
          })();
        }}
        playlists={queuePlaylistTargets}
      />
    </SafeAreaView>
  );
};
