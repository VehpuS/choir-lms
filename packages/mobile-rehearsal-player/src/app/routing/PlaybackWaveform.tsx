import type { PlayableItem } from '@org/audio-library-models';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { appTheme } from '../utils/theme';
import {
  clampWaveformRatio,
  getPlaybackBoundsSeconds,
  hasWaveformProgressSettled,
  isWaveformScrubReady,
  resolveWaveformCommitRatio,
  resolveWaveformRatioFromLocation,
} from './PlaybackWaveformModel';

const WAVEFORM_BARS = [
  0.22, 0.36, 0.54, 0.44, 0.68, 0.3, 0.58, 0.4, 0.74, 0.48, 0.62, 0.34, 0.72,
  0.38, 0.57, 0.29, 0.64, 0.42, 0.77, 0.35, 0.59, 0.31, 0.69, 0.47, 0.56, 0.33,
  0.61, 0.27,
] as const;

type PlaybackWaveformProps = {
  activePlayableItem: PlayableItem;
  appearance?: 'dark' | 'light';
  interactive?: boolean;
  onScrubToPosition?: (positionSeconds: number) => void;
  progressRatio: number;
  style?: StyleProp<ViewStyle>;
  variant?: 'compact' | 'hero';
};

const getWaveformHeight = (variant: PlaybackWaveformProps['variant']) => {
  return variant === 'hero' ? 154 : 28;
};

export const PlaybackWaveform = ({
  activePlayableItem,
  appearance = 'light',
  interactive = false,
  onScrubToPosition,
  progressRatio,
  style,
  variant = 'compact',
}: PlaybackWaveformProps) => {
  const [draftRatio, setDraftRatio] = useState<number | null>(null);
  const draftRatioRef = useRef<number | null>(null);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const waveformHeight = getWaveformHeight(variant);
  const { endSeconds, startSeconds } =
    getPlaybackBoundsSeconds(activePlayableItem);
  const hasScrubRange = endSeconds > startSeconds;
  const displayedRatio = clampWaveformRatio(draftRatio ?? progressRatio);
  const canScrub = isWaveformScrubReady({
    hasScrubRange,
    interactive,
    layoutWidth,
    onScrubToPosition,
  });
  const activeColor = appearance === 'dark' ? '#fff8ef' : '#305c4d';
  const inactiveColor =
    appearance === 'dark' ? 'rgba(209, 232, 221, 0.28)' : '#d5ddd7';
  const indicatorColor =
    appearance === 'dark' ? 'rgba(255, 248, 239, 0.55)' : '#6f8e82';

  useEffect(() => {
    if (
      !hasWaveformProgressSettled({
        progressRatio,
        targetRatio: draftRatio,
      })
    ) {
      return;
    }

    if (draftRatio === null) {
      return;
    }

    draftRatioRef.current = null;
    setDraftRatio(null);
  }, [draftRatio, progressRatio]);

  const commitScrub = (ratio: number) => {
    if (!onScrubToPosition) {
      return;
    }

    const boundedRatio = clampWaveformRatio(ratio);
    const nextPositionSeconds =
      startSeconds + (endSeconds - startSeconds) * boundedRatio;

    onScrubToPosition(nextPositionSeconds);
  };

  const updateDraftRatio = (locationX: number) => {
    if (!canScrub) {
      return 0;
    }

    const nextRatio = resolveWaveformRatioFromLocation(locationX, layoutWidth);

    draftRatioRef.current = nextRatio;
    setDraftRatio(nextRatio);

    return nextRatio;
  };

  return (
    <View
      accessibilityHint={
        interactive
          ? 'Drag horizontally to scrub the active rehearsal item.'
          : undefined
      }
      accessibilityLabel={interactive ? 'Playback waveform' : undefined}
      accessible={interactive}
      onLayout={(event: LayoutChangeEvent) => {
        setLayoutWidth(event.nativeEvent.layout.width);
      }}
      onMoveShouldSetResponder={() => canScrub}
      onResponderGrant={(event) => {
        updateDraftRatio(event.nativeEvent.locationX);
      }}
      onResponderMove={(event) => {
        updateDraftRatio(event.nativeEvent.locationX);
      }}
      onResponderRelease={(event) => {
        if (!canScrub) {
          draftRatioRef.current = null;
          setDraftRatio(null);
          return;
        }

        const nextRatio = resolveWaveformCommitRatio({
          draftRatio: draftRatioRef.current,
          layoutWidth,
          locationX: event.nativeEvent.locationX,
        });

        draftRatioRef.current = nextRatio;
        setDraftRatio(nextRatio);
        commitScrub(nextRatio);
      }}
      onResponderTerminate={() => {
        draftRatioRef.current = null;
        setDraftRatio(null);
      }}
      onStartShouldSetResponder={() => canScrub}
      style={[
        styles.container,
        variant === 'hero' ? styles.heroContainer : styles.compactContainer,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.barRow,
          variant === 'compact' ? styles.compactBarRow : null,
        ]}
      >
        {WAVEFORM_BARS.map((amplitude, index) => {
          const threshold = (index + 1) / WAVEFORM_BARS.length;
          const barHeight = Math.max(
            variant === 'hero' ? 18 : 8,
            Math.round(amplitude * waveformHeight),
          );

          return (
            <View
              key={`${variant}:${index}`}
              style={[
                styles.bar,
                variant === 'hero' ? styles.heroBar : styles.compactBar,
                {
                  backgroundColor:
                    displayedRatio >= threshold ? activeColor : inactiveColor,
                  height: barHeight,
                },
              ]}
            />
          );
        })}
      </View>
      {interactive ? (
        <View
          pointerEvents="none"
          style={[
            styles.scrubIndicator,
            {
              backgroundColor: indicatorColor,
              left: `${displayedRatio * 100}%`,
            },
          ]}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  compactContainer: {
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroContainer: {
    minHeight: 188,
    paddingHorizontal: 14,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 28,
    backgroundColor: '#f7f1e6',
  },
  barRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  compactBarRow: {
    gap: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 999,
  },
  compactBar: {
    minWidth: 2,
  },
  heroBar: {
    minWidth: 4,
  },
  scrubIndicator: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    width: 2,
    marginLeft: -1,
    borderRadius: 999,
  },
});
