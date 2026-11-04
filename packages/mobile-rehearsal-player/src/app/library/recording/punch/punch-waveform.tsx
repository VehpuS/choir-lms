import type { PlayableItem } from '@org/audio-library-models';
import type { PunchPoint } from '@org/audio-mixing';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { MarkerFlagsLayer } from '../../../components/playback-waveform/marker-flags-layer';
import {
  resolveWaveformFlags,
  type WaveformFlag,
  type WaveformMarker,
} from '../../../components/playback-waveform/marker-flags-model';
import { resolvePlaybackWaveformBars } from '../../../components/playback-waveform/model';
import { MIN_BAR_HEIGHT } from '../../../components/playback-waveform/variants';
import { appTheme } from '../../../utils/theme';
import {
  useWaveformPeaks,
  useWaveformPeaksPending,
} from '../../playback/waveform-peaks/use-waveform-peaks';

const { colors, radius, space } = appTheme;
const BAR_COUNT = 72;
const BAR_AREA_HEIGHT = 96;
const WAVEFORM_HEIGHT = 140;
const BADGE_HEIGHT = 22;
const HANDLE_HIT_WIDTH = appTheme.space.touchTarget;
const HANDLE_LINE_WIDTH = 2;
const PERCENT = 100;

type PunchWaveformProps = {
  item: PlayableItem;
  durationMs: number;
  markers: readonly WaveformMarker[];
  /** Each point's place across the track, 0 to 1; absent while not set. */
  inRatio?: number;
  outRatio?: number;
  playheadRatio: number;
  /** A handle moved to a place across the track; the sheet snaps and stores it. */
  onDragPoint: (point: PunchPoint, ratio: number, widthPx: number) => void;
  /** An assistive-technology nudge of a handle. */
  onNudgePoint: (point: PunchPoint, direction: 1 | -1) => void;
  onFlagPress: (flag: WaveformFlag) => void;
};

const HANDLE_LABELS: Record<PunchPoint, { badge: string; name: string }> = {
  in: { badge: 'In', name: 'In point' },
  out: { badge: 'Out', name: 'Out point' },
};

/**
 * The whole-track waveform of the punch sheet (rehearsal-recording design
 * Decision 18): the range between the `In` and `Out` handles is highlighted,
 * marker flags can be tapped to set a point, and dragging reports the place
 * across the track for the sheet to snap.
 */
export const PunchWaveform = ({
  durationMs,
  inRatio,
  item,
  markers,
  onDragPoint,
  onFlagPress,
  onNudgePoint,
  outRatio,
  playheadRatio,
}: PunchWaveformProps) => {
  const [width, setWidth] = useState(0);
  const peaks = useWaveformPeaks(item.source);
  const isAnalyzing = useWaveformPeaksPending(item.source);
  const bars = useMemo(
    () => resolvePlaybackWaveformBars({ barCount: BAR_COUNT, item, peaks }),
    [item, peaks],
  );
  const flags = useMemo(
    () =>
      resolveWaveformFlags({ endMs: durationMs, markers, startMs: 0, width }),
    [durationMs, markers, width],
  );
  const low = Math.min(inRatio ?? 0, outRatio ?? 1);
  const high = Math.max(inRatio ?? 0, outRatio ?? 1);
  const hasRange = inRatio !== undefined && outRatio !== undefined;
  // One responder per handle survives re-renders while it is dragged.
  const latest = useRef({ inRatio, outRatio, width, onDragPoint });

  latest.current = { inRatio, onDragPoint, outRatio, width };

  const createResponder = (point: PunchPoint) => {
    let startRatio = 0;

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        startRatio =
          (point === 'in' ? latest.current.inRatio : latest.current.outRatio) ??
          0;
      },
      onPanResponderMove: (_, gesture) => {
        const { onDragPoint: drag, width: current } = latest.current;

        if (current > 0) {
          drag(point, startRatio + gesture.dx / current, current);
        }
      },
      onPanResponderTerminationRequest: () => false,
      onStartShouldSetPanResponder: () => true,
    });
  };
  const inResponder = useMemo(() => createResponder('in'), []);
  const outResponder = useMemo(() => createResponder('out'), []);

  const renderHandle = (point: PunchPoint, ratio: number | undefined) => {
    if (ratio === undefined) {
      return null;
    }

    const { badge, name } = HANDLE_LABELS[point];
    const responder = point === 'in' ? inResponder : outResponder;

    return (
      <View
        accessibilityActions={[
          { label: 'Move later', name: 'increment' },
          { label: 'Move earlier', name: 'decrement' },
        ]}
        accessibilityLabel={name}
        accessibilityRole="adjustable"
        accessible
        onAccessibilityAction={(event: AccessibilityActionEvent) =>
          onNudgePoint(
            point,
            event.nativeEvent.actionName === 'increment' ? 1 : -1,
          )
        }
        style={[
          styles.handle,
          { left: `${ratio * PERCENT}%`, marginLeft: -HANDLE_HIT_WIDTH / 2 },
        ]}
        {...responder.panHandlers}
      >
        <View style={[styles.badge, point === 'out' ? styles.badgeOut : null]}>
          <Text style={styles.badgeLabel}>{badge}</Text>
        </View>
        <View
          style={[styles.handleLine, point === 'out' ? styles.lineOut : null]}
        />
      </View>
    );
  };

  return (
    <View
      onLayout={(event: LayoutChangeEvent) =>
        setWidth(event.nativeEvent.layout.width)
      }
      style={styles.waveform}
    >
      {isAnalyzing ? (
        <View
          accessibilityLabel="Loading waveform…"
          accessibilityLiveRegion="polite"
          accessible
          style={styles.loading}
        >
          <ActivityIndicator color={colors.accentText} />
        </View>
      ) : null}
      {hasRange ? (
        <View
          pointerEvents="none"
          style={[
            styles.region,
            {
              left: `${low * PERCENT}%`,
              width: `${(high - low) * PERCENT}%`,
            },
          ]}
        />
      ) : null}
      <View pointerEvents="none" style={styles.barRow}>
        {bars.map((amplitude, index) => {
          const isInside =
            hasRange &&
            (index + 1) / bars.length > low &&
            index / bars.length < high;

          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  backgroundColor: isInside ? colors.accent : colors.divider,
                  height: Math.max(
                    MIN_BAR_HEIGHT.scrubber,
                    Math.round(amplitude * BAR_AREA_HEIGHT),
                  ),
                },
              ]}
            />
          );
        })}
      </View>
      <View
        pointerEvents="none"
        style={[styles.playhead, { left: `${playheadRatio * PERCENT}%` }]}
      />
      {flags.length > 0 ? (
        <MarkerFlagsLayer
          flags={flags}
          onFlagPress={onFlagPress}
          width={width}
        />
      ) : null}
      {durationMs > 0 ? renderHandle('in', inRatio) : null}
      {durationMs > 0 ? renderHandle('out', outRatio) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    borderRadius: 2,
    flex: 1,
    marginHorizontal: 0.5,
    maxWidth: 3,
  },
  barRow: {
    alignItems: 'center',
    flexDirection: 'row',
    height: BAR_AREA_HEIGHT,
    justifyContent: 'space-between',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    height: BADGE_HEIGHT,
    justifyContent: 'center',
    minWidth: BADGE_HEIGHT,
    paddingHorizontal: space.xs,
  },
  badgeLabel: {
    color: colors.bg,
    fontSize: 12,
    fontWeight: appTheme.fontWeight.medium,
  },
  badgeOut: { backgroundColor: colors.danger },
  handle: {
    alignItems: 'center',
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: HANDLE_HIT_WIDTH,
  },
  handleLine: {
    backgroundColor: colors.accent,
    flex: 1,
    width: HANDLE_LINE_WIDTH,
  },
  lineOut: { backgroundColor: colors.danger },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playhead: {
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    bottom: space.xs,
    marginLeft: -1,
    position: 'absolute',
    top: BADGE_HEIGHT + space.sm,
    width: 2,
  },
  region: {
    backgroundColor: colors.accentRegionFill,
    borderColor: colors.accentRegionEdge,
    borderRadius: radius.md,
    borderWidth: 1,
    bottom: 0,
    position: 'absolute',
    top: BADGE_HEIGHT + space.xs,
  },
  waveform: { height: WAVEFORM_HEIGHT, justifyContent: 'flex-end' },
});
