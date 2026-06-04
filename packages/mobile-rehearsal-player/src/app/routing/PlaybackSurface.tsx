import type {
  PlayableItem,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { NowPlayingSurface, QueueSurface } from './PlaybackSurfaceContent';
import type {
  NowPlayingSurfaceSummary,
  UpNextSurfaceSummary,
} from './shell-model';

type PlaybackSurfaceMode = 'now-playing' | 'queue';

type PlaybackSurfaceProps = {
  activePlayableItem: PlayableItem | null;
  activeQueueMode: RehearsalQueueMode | null;
  activeRepeatMode: RepeatMode | null;
  canSeekActivePlayback: boolean;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  isPlaybackToggleDisabled: boolean;
  isSavingQueueAsPlaylist: boolean;
  nowPlayingSummary: NowPlayingSurfaceSummary | null;
  onAdjustPlaybackVolume: (volumeLevel: number) => void;
  onAppendQueueToPlaylist: () => void;
  onClose: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onSeekToPosition: (positionSeconds: number) => void;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSaveQueueAsPlaylist: () => void;
  onSelectRepeatMode: (mode: RepeatMode) => void;
  onShowNowPlaying: () => void;
  onShowQueue: () => void;
  onSkipNextItem: () => void;
  onSkipPreviousItem: () => void;
  onTogglePlayback: () => void;
  playbackPositionSeconds: number;
  playbackToggleLabel: string;
  playbackVolumeLevel: number;
  queueSummary: UpNextSurfaceSummary | null;
  surface: PlaybackSurfaceMode | null;
};

export const PlaybackSurface = ({
  activePlayableItem,
  activeQueueMode,
  activeRepeatMode,
  canSeekActivePlayback,
  canSkipNextItem,
  canSkipPreviousItem,
  isPlaybackToggleDisabled,
  isSavingQueueAsPlaylist,
  nowPlayingSummary,
  onAdjustPlaybackVolume,
  onAppendQueueToPlaylist,
  onClose,
  onSeekBackward,
  onSeekForward,
  onSeekToPosition,
  onSelectQueueMode,
  onSaveQueueAsPlaylist,
  onSelectRepeatMode,
  onShowNowPlaying,
  onShowQueue,
  onSkipNextItem,
  onSkipPreviousItem,
  onTogglePlayback,
  playbackPositionSeconds,
  playbackToggleLabel,
  playbackVolumeLevel,
  queueSummary,
  surface,
}: PlaybackSurfaceProps) => {
  const translateY = useRef(new Animated.Value(32)).current;
  const canRenderQueue = surface === 'queue' && queueSummary;
  const canRenderNowPlaying = surface === 'now-playing' && nowPlayingSummary;

  const dismissSurface = () => {
    Animated.timing(translateY, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        translateY.setValue(32);
        onClose();
      }
    });
  };

  const resetSurfacePosition = () => {
    Animated.spring(translateY, {
      damping: 20,
      mass: 0.9,
      stiffness: 220,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    translateY.setValue(32);

    Animated.spring(translateY, {
      damping: 18,
      mass: 0.9,
      stiffness: 210,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [surface, translateY]);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          gestureState.dy > 8 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        translateY.setValue(Math.max(0, gestureState.dy));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1.1) {
          dismissSurface();
          return;
        }

        resetSurfacePosition();
      },
      onPanResponderTerminate: () => {
        resetSurfacePosition();
      },
    });
  }, [translateY]);

  if (!surface) {
    return null;
  }

  if (!canRenderQueue && !canRenderNowPlaying) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable
        accessibilityRole="button"
        onPress={dismissSurface}
        style={styles.backdrop}
      />
      <View style={styles.sheetContainer}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.sheetFrame, { transform: [{ translateY }] }]}
        >
          {canRenderQueue && queueSummary ? (
            <QueueSurface
              activeQueueMode={activeQueueMode ?? 'ordered'}
              activeRepeatMode={activeRepeatMode ?? 'off'}
              isPlaybackToggleDisabled={isPlaybackToggleDisabled}
              onClose={dismissSurface}
              onSelectQueueMode={onSelectQueueMode}
              onSelectRepeatMode={onSelectRepeatMode}
              onShowNowPlaying={onShowNowPlaying}
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
              isSavingQueueAsPlaylist={isSavingQueueAsPlaylist}
              isPlaybackToggleDisabled={isPlaybackToggleDisabled}
              onAdjustPlaybackVolume={onAdjustPlaybackVolume}
              onAppendQueueToPlaylist={onAppendQueueToPlaylist}
              onClose={dismissSurface}
              onSeekBackward={onSeekBackward}
              onSeekForward={onSeekForward}
              onSeekToPosition={onSeekToPosition}
              onSelectQueueMode={onSelectQueueMode}
              onSaveQueueAsPlaylist={onSaveQueueAsPlaylist}
              onSelectRepeatMode={onSelectRepeatMode}
              onShowQueue={onShowQueue}
              onSkipNextItem={onSkipNextItem}
              onSkipPreviousItem={onSkipPreviousItem}
              onTogglePlayback={onTogglePlayback}
              playbackPositionSeconds={playbackPositionSeconds}
              playbackToggleLabel={playbackToggleLabel}
              playbackVolumeLevel={playbackVolumeLevel}
              queueSummary={queueSummary}
              summary={nowPlayingSummary}
            />
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 15,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(23, 50, 41, 0.32)',
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  sheetFrame: {
    width: '100%',
  },
});
