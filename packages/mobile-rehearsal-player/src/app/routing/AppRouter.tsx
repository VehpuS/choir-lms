import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { SummaryCard } from '../components/SummaryCard';
import { DriveSessionMenu } from '../auth/components/DriveSessionMenu';
import { useGoogleDriveAuthorization } from '../auth/hooks/use-google-drive-authorization';
import { useRehearsalLibraryScreenController } from '../library/hooks/use-rehearsal-library-screen-controller';
import { useSavedTrackPlayback } from '../library/hooks/use-saved-track-playback';
import type { PlaylistPlaybackSession } from '../library/utils/saved-playlist-playback-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  type SavedTrackPlaybackState,
} from '../library/utils/saved-track-playback-view-model';
import { HomeScreen } from '../screens/HomeScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { appTheme } from '../utils/theme';
import { PlaybackSurface } from './PlaybackSurface';
import {
  SHELL_DESTINATIONS,
  getMiniPlayerSummary,
  getNowPlayingSurfaceSummary,
  getUpNextSurfaceSummary,
  type ShellDestinationKey,
} from './shell-model';

type PlaybackSurfaceKey = 'now-playing' | 'queue';

type MobileShellProps = {
  activePlayableItem: ReturnType<
    typeof useSavedTrackPlayback
  >['activePlayableItem'];
  activePlaylistSession: PlaylistPlaybackSession | null;
  activeQueueMode: PlaylistPlaybackSession['queue']['mode'] | null;
  activeRepeatMode: PlaylistPlaybackSession['queue']['repeatMode'] | null;
  authorization: ReturnType<typeof useGoogleDriveAuthorization>;
  canSeekActivePlayback: boolean;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  homeScreen: ReactNode;
  isPlaybackPreparing: boolean;
  isPlaybackToggleDisabled: boolean;
  libraryScreen: ReactNode;
  onSeekToPosition: (positionSeconds: number) => void;
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
  searchScreen: ReactNode;
};

const PANEL_BY_DESTINATION: Record<
  ShellDestinationKey,
  keyof Pick<MobileShellProps, 'homeScreen' | 'libraryScreen' | 'searchScreen'>
> = {
  home: 'homeScreen',
  search: 'searchScreen',
  library: 'libraryScreen',
};

export const MobileShell = ({
  activePlayableItem,
  activePlaylistSession,
  activeQueueMode,
  activeRepeatMode,
  authorization,
  canSeekActivePlayback,
  canSkipNextItem,
  canSkipPreviousItem,
  homeScreen,
  isPlaybackPreparing,
  isPlaybackToggleDisabled,
  libraryScreen,
  onSeekToPosition,
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
  searchScreen,
}: MobileShellProps) => {
  const [activeDestination, setActiveDestination] =
    useState<ShellDestinationKey>('home');
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
  const activeDestinationConfig =
    SHELL_DESTINATIONS.find(
      (destination) => destination.key === activeDestination,
    ) ?? SHELL_DESTINATIONS[0];

  useEffect(() => {
    if (!miniPlayerSummary) {
      setActivePlaybackSurface(null);
    }
  }, [miniPlayerSummary]);

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
            homeScreen,
            libraryScreen,
            searchScreen,
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

      {miniPlayerSummary ? (
        <View style={styles.miniPlayerSection}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setActivePlaybackSurface('now-playing');
              setIsSessionMenuVisible(false);
            }}
            style={({ pressed }) => [
              styles.miniPlayer,
              pressed ? styles.miniPlayerPressed : null,
            ]}
            testID="mini-player"
          >
            <View style={styles.miniPlayerCopy}>
              <Text style={styles.miniPlayerLabel}>Now playing</Text>
              <Text style={styles.miniPlayerTitle} testID="mini-player-title">
                {miniPlayerSummary.title}
              </Text>
              <Text style={styles.miniPlayerStatus}>
                {miniPlayerSummary.status}
              </Text>
              <Text style={styles.miniPlayerDetail}>
                {miniPlayerSummary.detail}
              </Text>
            </View>
            <Text style={styles.miniPlayerAction}>Open</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.tabBar}>
        {SHELL_DESTINATIONS.map((destination) => {
          const isActive = destination.key === activeDestination;

          return (
            <Pressable
              key={destination.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                setIsSessionMenuVisible(false);
                setActiveDestination(destination.key);
              }}
              style={({ pressed }) => [
                styles.tab,
                isActive ? styles.tabActive : null,
                pressed ? styles.tabPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : null,
                ]}
              >
                {destination.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <PlaybackSurface
        activePlayableItem={activePlayableItem}
        activeQueueMode={activeQueueMode}
        activeRepeatMode={activeRepeatMode}
        canSeekActivePlayback={canSeekActivePlayback}
        canSkipNextItem={canSkipNextItem}
        canSkipPreviousItem={canSkipPreviousItem}
        isPlaybackToggleDisabled={isPlaybackToggleDisabled}
        nowPlayingSummary={nowPlayingSummary}
        onAdjustPlaybackVolume={onSetPlaybackVolume}
        onClose={() => {
          setActivePlaybackSurface(null);
        }}
        onSeekToPosition={onSeekToPosition}
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
    </SafeAreaView>
  );
};

export const AppRouter = () => {
  const authorization = useGoogleDriveAuthorization();
  const playback = useSavedTrackPlayback(authorization.authState);
  const libraryController = useRehearsalLibraryScreenController({
    authState: authorization.authState,
    googleAuthConfigured: authorization.googleAuthConfigured,
    playback,
  });
  const playbackActionCopy = playback.activePlayableItem
    ? getSavedTrackPlaybackActionCopy({
        activePlayableItem: playback.activePlayableItem,
        isPreparing: playback.isPreparing,
        playableItem: playback.activePlayableItem,
        playbackState: playback.playbackState,
      })
    : null;

  return (
    <MobileShell
      activePlayableItem={playback.activePlayableItem}
      activePlaylistSession={playback.activePlaylistSession}
      activeQueueMode={playback.activePlaylistSession?.queue.mode ?? null}
      activeRepeatMode={
        playback.activePlaylistSession?.queue.repeatMode ?? null
      }
      authorization={authorization}
      canSeekActivePlayback={
        playback.activePlayableItem !== null && !playback.isPreparing
      }
      canSkipNextItem={
        playback.activePlaylistSession !== null && !playback.isPreparing
      }
      canSkipPreviousItem={
        playback.activePlayableItem !== null && !playback.isPreparing
      }
      homeScreen={
        <HomeScreen
          activePlayableItem={playback.activePlayableItem}
          libraryController={libraryController}
          savedTrackCount={libraryController.savedLibrary.trackCount}
        />
      }
      isPlaybackPreparing={playback.isPreparing}
      isPlaybackToggleDisabled={playbackActionCopy?.disabled ?? true}
      libraryScreen={
        <LibraryScreen
          libraryController={libraryController}
          playback={playback}
        />
      }
      onSeekToPosition={(positionSeconds) => {
        void playback.seekActivePlaybackToPosition(positionSeconds);
      }}
      onSelectQueueMode={(mode) => {
        playback.setPlaylistQueueMode(mode);
      }}
      onSelectRepeatMode={(mode) => {
        playback.setPlaylistRepeatMode(mode);
      }}
      onSetPlaybackVolume={(volumeLevel) => {
        void playback.setPlaybackVolume(volumeLevel);
      }}
      onSkipNextItem={() => {
        void playback.skipToNextItem();
      }}
      onSkipPreviousItem={() => {
        void playback.skipToPreviousItem();
      }}
      onTogglePlayback={() => {
        void playback.toggleActivePlayback();
      }}
      playbackPositionSeconds={playback.progress.position}
      playbackToggleLabel={playbackActionCopy?.label ?? 'Play'}
      playbackVolumeLevel={playback.volumeLevel}
      playbackState={playback.playbackState}
      searchScreen={<SearchScreen libraryController={libraryController} />}
    />
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: 'relative',
    gap: 12,
    backgroundColor: appTheme.colors.pageBackground,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 5,
  },
  headerCard: {
    position: 'relative',
    zIndex: 10,
    gap: 8,
    padding: 20,
    borderRadius: 24,
    backgroundColor: appTheme.colors.heroBackground,
    overflow: 'visible',
  },
  headerTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: {
    color: '#d1e8dd',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#fff8ef',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  headerBody: {
    color: '#dce7e1',
    fontSize: 15,
    lineHeight: 22,
  },
  contentViewport: {
    flex: 1,
  },
  destinationPanel: {
    flex: 1,
  },
  destinationPanelActive: {
    display: 'flex',
  },
  destinationPanelHidden: {
    display: 'none',
  },
  miniPlayerSection: {
    gap: 10,
  },
  miniPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#2d584a',
    borderRadius: 22,
    backgroundColor: '#173229',
  },
  miniPlayerPressed: {
    opacity: 0.9,
  },
  miniPlayerCopy: {
    flex: 1,
    gap: 2,
  },
  miniPlayerLabel: {
    color: '#d1e8dd',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  miniPlayerTitle: {
    color: '#fff8ef',
    fontSize: 16,
    fontWeight: '700',
  },
  miniPlayerStatus: {
    color: '#dce7e1',
    fontSize: 13,
    lineHeight: 18,
  },
  miniPlayerDetail: {
    color: '#b7d3c7',
    fontSize: 12,
    lineHeight: 16,
  },
  miniPlayerAction: {
    color: '#fff8ef',
    fontSize: 14,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 253, 248, 0.94)',
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  tabActive: {
    backgroundColor: appTheme.colors.heroBackground,
  },
  tabPressed: {
    opacity: 0.88,
  },
  tabLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#fff8ef',
  },
});
