import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { useEscapeToDismiss } from '../../components/escape-to-dismiss/use-escape-to-dismiss';
import { SafeAreaFrame } from '../../components/safe-area-frame';
import { appTheme } from '../../utils/theme';
import { usePracticeDockHeight } from '../../library/practice-tools/use-practice-dock-height';
import { useLayoutClass } from '../shell/layout-class';
import { SHELL_LAYERS } from '../shell/shell-layers';
import { CompactPlaybackContent } from './compact-playback-content';
import { shouldStartPlaybackSurfaceDismissGesture } from './playback-surface-gestures';
import { getPlaybackSurfaceMotion } from './playback-surface-motion';
import type { PlaybackSurfaceProps } from './playback-surface-props';
import { WideShortPlaybackContent } from './wide-short-playback-content';

export const PlaybackSurface = (props: PlaybackSurfaceProps) => {
  const { nowPlayingSummary, onClose, queueSummary, surface } = props;
  const isWideShort = useLayoutClass() === 'wide-short';
  const { axis, enterOffset, exitOffset } =
    getPlaybackSurfaceMotion(isWideShort);
  const offset = useRef(new Animated.Value(enterOffset)).current;
  // The compact sheet slides in again when its content is replaced by another
  // surface; the wide-short sheet keeps its columns and only changes a tab, so
  // it slides in once, when it opens.
  const animationKey = isWideShort ? surface !== null : surface;
  // While the piano is open the shell floats it over the bottom of this
  // sheet, so the sheet stops above it and keeps its transport in view.
  const pianoDockHeight = usePracticeDockHeight({
    isPlaybackSurfaceOpen: true,
  });
  const canRenderQueue = surface === 'queue' && queueSummary;
  const canRenderNowPlaying = surface === 'now-playing' && nowPlayingSummary;
  const canRenderShaping = surface === 'shaping' && nowPlayingSummary;

  const dismissSurface = () => {
    Animated.timing(offset, {
      toValue: exitOffset,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        offset.setValue(enterOffset);
        onClose();
      }
    });
  };

  const resetSurfacePosition = () => {
    Animated.spring(offset, {
      damping: 20,
      mass: 0.9,
      stiffness: 220,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    offset.setValue(enterOffset);

    Animated.spring(offset, {
      damping: 18,
      mass: 0.9,
      stiffness: 210,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [animationKey, enterOffset, offset]);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (event, gestureState) => {
        return shouldStartPlaybackSurfaceDismissGesture({
          dx: gestureState.dx,
          dy: gestureState.dy,
          locationY: event.nativeEvent.locationY,
        });
      },
      onPanResponderMove: (_, gestureState) => {
        offset.setValue(Math.max(0, gestureState.dy));
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
  }, [offset]);
  // The drag-down dismissal is the upright sheet's; the wide-short sheet slides
  // along the horizontal axis and closes by its button, the scrim or Escape.
  const sheetFramePanHandlers =
    canRenderQueue || isWideShort ? {} : panResponder.panHandlers;

  // On web there is no swipe-down: Escape closes the sheet the way the
  // caret-down control does.
  useEscapeToDismiss(surface !== null, dismissSurface);

  if (!surface) {
    return null;
  }

  if (!canRenderQueue && !canRenderNowPlaying && !canRenderShaping) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable
        accessibilityRole="button"
        onPress={dismissSurface}
        style={styles.backdrop}
      />
      <SafeAreaFrame
        // A padding here replaces the bottom inset, so only set it when the
        // piano dock needs room (the dock then sits above the home indicator).
        style={[
          styles.sheetContainer,
          isWideShort ? styles.sheetContainerWide : null,
          pianoDockHeight > 0 ? { paddingBottom: pianoDockHeight } : null,
        ]}
      >
        <Animated.View
          {...sheetFramePanHandlers}
          style={[
            styles.sheetFrame,
            isWideShort ? styles.sheetFrameWide : null,
            {
              transform:
                axis === 'x'
                  ? [{ translateX: offset }]
                  : [{ translateY: offset }],
            },
          ]}
        >
          {isWideShort ? (
            <WideShortPlaybackContent
              {...props}
              dragHandleProps={panResponder.panHandlers}
              onClose={dismissSurface}
            />
          ) : (
            <CompactPlaybackContent
              {...props}
              dragHandleProps={panResponder.panHandlers}
              onClose={dismissSurface}
            />
          )}
        </Animated.View>
      </SafeAreaFrame>
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
    zIndex: SHELL_LAYERS.playbackSheet,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: appTheme.colors.scrim,
  },
  // Now playing (1f) and Up next (1h) are flush bottom sheets with a strip of
  // backdrop above them to tap away; the frame caps them so their bodies
  // scroll on short screens.
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: 56,
  },
  sheetFrame: {
    width: '100%',
    maxHeight: '100%',
  },
  // A short, wide window: a thin strip of backdrop above, and a sheet that
  // fills the rest so its two columns have a height to share.
  sheetContainerWide: {
    paddingTop: appTheme.space.lg,
  },
  sheetFrameWide: {
    flex: 1,
  },
});
