import type { PlayableItem } from '@org/audio-library-models';
import { useEffect, useRef, useState } from 'react';
import {
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

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
  BAR_ROW_STYLE,
  BAR_STYLE,
  CONTAINER_STYLE,
  waveformStyles,
} from './styles';
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
        waveformStyles.container,
        CONTAINER_STYLE[variant],
        interactive ? continuousInteractionGuardStyle : undefined,
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[waveformStyles.barRow, BAR_ROW_STYLE[variant]]}
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
                waveformStyles.bar,
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
            waveformStyles.scrubIndicator,
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
