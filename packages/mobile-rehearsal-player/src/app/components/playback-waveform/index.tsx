import type { PlayableItem } from '@org/audio-library-models';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { MarkerFlagsLayer } from './marker-flags-layer';
import { useWaveformLongPress } from './use-waveform-long-press';
import {
  resolveWaveformFlags,
  resolveWaveformPositionMs,
  type WaveformFlag,
  type WaveformMarker,
} from './marker-flags-model';
import {
  clampWaveformRatio,
  getPlaybackBoundsSeconds,
  hasWaveformProgressSettled,
  isWaveformBarPlayed,
  isWaveformScrubReady,
  resolvePlaybackWaveformBars,
  resolveWaveformCommitRatio,
  resolveWaveformRatioFromLocation,
} from './model';
import {
  MIN_BAR_HEIGHT,
  WAVEFORM_BAR_COUNT,
  WAVEFORM_HEIGHT,
  getWaveformColors,
  type PlaybackWaveformAppearance,
  type PlaybackWaveformVariant,
} from './variants';
import {
  BAR_ROW_STYLE,
  BAR_STYLE,
  CONTAINER_STYLE,
  SCRUB_INDICATOR_STYLE,
  waveformStyles,
} from './styles';
import { useWaveformPeaks } from '../../library/playback/waveform-peaks/use-waveform-peaks';
import {
  continuousInteractionGuardStyle,
  interactionGuardProps,
} from '../interaction-guard';

type PlaybackWaveformProps = {
  activePlayableItem: PlayableItem;
  appearance?: PlaybackWaveformAppearance;
  interactive?: boolean;
  /** Markers to draw as flags, already filtered; none draws nothing. */
  markers?: readonly WaveformMarker[];
  onFlagLongPress?: (flag: WaveformFlag) => void;
  onFlagPress?: (flag: WaveformFlag) => void;
  /** Long press on empty waveform, at the audio position pressed. */
  onLongPressPosition?: (positionMs: number) => void;
  onScrubToPosition?: (positionSeconds: number) => void;
  progressRatio: number;
  style?: StyleProp<ViewStyle>;
  variant?: PlaybackWaveformVariant;
};

export const PlaybackWaveform = ({
  activePlayableItem,
  appearance = 'light',
  interactive = false,
  markers,
  onFlagLongPress,
  onFlagPress,
  onLongPressPosition,
  onScrubToPosition,
  progressRatio,
  style,
  variant = 'compact',
}: PlaybackWaveformProps) => {
  const [draftRatio, setDraftRatio] = useState<number | null>(null);
  const draftRatioRef = useRef<number | null>(null);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const waveformHeight = WAVEFORM_HEIGHT[variant];
  const peaks = useWaveformPeaks(activePlayableItem.source);
  const bars = useMemo(() => {
    return resolvePlaybackWaveformBars({
      barCount: WAVEFORM_BAR_COUNT[variant],
      item: activePlayableItem,
      peaks,
    });
  }, [activePlayableItem, peaks, variant]);
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
  const flags = useMemo(() => {
    return resolveWaveformFlags({
      endMs: endSeconds * 1000,
      markers: markers ?? [],
      startMs: startSeconds * 1000,
      width: layoutWidth,
    });
  }, [endSeconds, layoutWidth, markers, startSeconds]);
  // When a long press fires, the scrub draft is dropped so the playhead stays
  // where it was.
  const longPress = useWaveformLongPress({
    onLongPress: onLongPressPosition
      ? (locationX) => {
          draftRatioRef.current = null;
          setDraftRatio(null);
          onLongPressPosition(
            resolveWaveformPositionMs(
              locationX,
              startSeconds * 1000,
              endSeconds * 1000,
              layoutWidth,
            ),
          );
        }
      : undefined,
  });

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
        longPress.start(event.nativeEvent.locationX);
        updateDraftRatio(event.nativeEvent.locationX);
      }}
      onResponderMove={(event) => {
        longPress.move(event.nativeEvent.locationX);

        if (!longPress.hasFired()) {
          updateDraftRatio(event.nativeEvent.locationX);
        }
      }}
      onResponderRelease={(event) => {
        if (longPress.consumeFired()) {
          return;
        }

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
        longPress.cancel();
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
      {flags.length > 0 ? (
        <MarkerFlagsLayer
          flags={flags}
          onFlagLongPress={onFlagLongPress}
          onFlagPress={onFlagPress}
          width={layoutWidth}
        />
      ) : null}
      {interactive ? (
        <View
          pointerEvents="none"
          style={[
            waveformStyles.scrubIndicator,
            SCRUB_INDICATOR_STYLE[variant],
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
