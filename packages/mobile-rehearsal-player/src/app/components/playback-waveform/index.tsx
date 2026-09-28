import type { PlayableItem } from '@org/audio-library-models';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { appTheme } from '../../utils/theme';
import {
  clampWaveformRatio,
  getPlaybackBoundsSeconds,
  hasWaveformProgressSettled,
  isWaveformBarPlayed,
  isWaveformScrubReady,
  resolveWaveformCommitRatio,
  resolveWaveformRatioFromLocation,
} from './model';
import {
  MIN_BAR_HEIGHT,
  MINI_WAVEFORM_BARS,
  WAVEFORM_BARS,
  WAVEFORM_HEIGHT,
  getWaveformColors,
  type PlaybackWaveformAppearance,
  type PlaybackWaveformVariant,
} from './variants';
import {
  continuousInteractionGuardStyle,
  interactionGuardProps,
} from '../interaction-guard';

type PlaybackWaveformProps = {
  activePlayableItem: PlayableItem;
  appearance?: PlaybackWaveformAppearance;
  interactive?: boolean;
  onScrubToPosition?: (positionSeconds: number) => void;
  progressRatio: number;
  style?: StyleProp<ViewStyle>;
  variant?: PlaybackWaveformVariant;
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
  const waveformHeight = WAVEFORM_HEIGHT[variant];
  const bars = variant === 'mini' ? MINI_WAVEFORM_BARS : WAVEFORM_BARS;
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
  const colors = getWaveformColors(variant, appearance);

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
      {...interactionGuardProps}
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
        CONTAINER_STYLE[variant],
        interactive ? continuousInteractionGuardStyle : undefined,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.barRow, BAR_ROW_STYLE[variant]]}
      >
        {bars.map((amplitude, index) => {
          const isPlayed = isWaveformBarPlayed({
            barCount: bars.length,
            barIndex: index,
            progressRatio: displayedRatio,
          });
          const barHeight = Math.max(
            MIN_BAR_HEIGHT[variant],
            Math.round(amplitude * waveformHeight),
          );

          return (
            <View
              key={`${variant}:${index}`}
              style={[
                styles.bar,
                BAR_STYLE[variant],
                {
                  backgroundColor: isPlayed ? colors.active : colors.inactive,
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
              backgroundColor: colors.indicator,
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
    backgroundColor: appTheme.colors.hairline,
  },
  heroContainer: {
    minHeight: 188,
    paddingHorizontal: 14,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 28,
    backgroundColor: appTheme.colors.surface,
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
  miniContainer: {
    height: WAVEFORM_HEIGHT.mini,
  },
  miniBarRow: {
    alignItems: 'center',
    gap: 2,
  },
  // Fixed 2pt bars: reset the shared `flex: 1` so the basis is the width.
  miniBar: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: 2,
    borderRadius: 2,
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

const CONTAINER_STYLE: Record<PlaybackWaveformVariant, ViewStyle> = {
  compact: styles.compactContainer,
  hero: styles.heroContainer,
  mini: styles.miniContainer,
};

const BAR_ROW_STYLE: Record<PlaybackWaveformVariant, ViewStyle | null> = {
  compact: styles.compactBarRow,
  hero: null,
  mini: styles.miniBarRow,
};

const BAR_STYLE: Record<PlaybackWaveformVariant, ViewStyle> = {
  compact: styles.compactBar,
  hero: styles.heroBar,
  mini: styles.miniBar,
};
