import type { PlayableItem } from '@org/audio-library-models';
import { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { MIN_BAR_HEIGHT } from '../../../../components/playback-waveform/variants';
import { resolvePlaybackWaveformBars } from '../../../../components/playback-waveform/model';
import { useWaveformPeaks } from '../../../playback/waveform-peaks/use-waveform-peaks';
import { appTheme } from '../../../../utils/theme';
import {
  getLoopEditorHandleRatio,
  getLoopEditorPlayheadRatio,
  getLoopEditorRegion,
  isLoopEditorBarInRegion,
  resolveLoopEditorHandleDrag,
  type LoopEditorRange,
} from '../../utils/loop-editor-model';
import type { LoopBuilderBoundary } from '../../utils/saved-loop-view-model';
import { formatLoopEditorScale } from './format';
import { loopEditorStyles as styles } from './styles';

const BAR_COUNT = 72;
const BAR_AREA_HEIGHT = 112;
const PERCENT = 100;

type LoopEditorWaveformProps = {
  onNudgeBoundary: (
    boundary: LoopBuilderBoundary,
    direction: 'earlier' | 'later',
  ) => void;
  onRangeChange: (sliderValue: number[]) => void;
  /** Absolute position of the loop preview, for the playhead. */
  playbackPositionSeconds: number;
  range: LoopEditorRange;
  selectedTrack: PlayableItem;
  trackDurationMs: number | null;
};

const HANDLE_LABELS: Record<
  LoopBuilderBoundary,
  { badge: string; name: string }
> = {
  end: { badge: 'B', name: 'Loop end handle' },
  start: { badge: 'A', name: 'Loop start handle' },
};

export const LoopEditorWaveform = ({
  onNudgeBoundary,
  onRangeChange,
  playbackPositionSeconds,
  range,
  selectedTrack,
  trackDurationMs,
}: LoopEditorWaveformProps) => {
  const [layoutWidth, setLayoutWidth] = useState(0);
  const durationMs = trackDurationMs ?? 0;
  const peaks = useWaveformPeaks(selectedTrack.source);
  const bars = useMemo(() => {
    return resolvePlaybackWaveformBars({
      barCount: BAR_COUNT,
      item: selectedTrack,
      peaks,
    });
  }, [peaks, selectedTrack]);
  const region = getLoopEditorRegion(range, durationMs);
  const playheadRatio = getLoopEditorPlayheadRatio({
    durationMs,
    positionSeconds: playbackPositionSeconds,
    range,
  });

  // Drag gestures read the latest values through refs so one responder per
  // handle survives re-renders while it is being dragged.
  const latestRef = useRef({ durationMs, layoutWidth, range, region });

  latestRef.current = { durationMs, layoutWidth, range, region };

  const createHandleResponder = (boundary: LoopBuilderBoundary) => {
    let startRatio = 0;

    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        startRatio = getLoopEditorHandleRatio(
          boundary,
          latestRef.current.region,
        );
      },
      onPanResponderMove: (_, gesture) => {
        const latest = latestRef.current;

        if (latest.layoutWidth <= 0 || latest.durationMs <= 0) {
          return;
        }

        const next = resolveLoopEditorHandleDrag({
          boundary,
          durationMs: latest.durationMs,
          range: latest.range,
          ratio: startRatio + gesture.dx / latest.layoutWidth,
        });

        onRangeChange([next.startMs / 1000, next.endMs / 1000]);
      },
      onPanResponderTerminationRequest: () => false,
      onStartShouldSetPanResponder: () => true,
    });
  };
  const startResponder = useMemo(() => createHandleResponder('start'), []);
  const endResponder = useMemo(() => createHandleResponder('end'), []);

  const renderHandle = (boundary: LoopBuilderBoundary, ratio: number) => {
    const responder = boundary === 'start' ? startResponder : endResponder;
    const { badge, name } = HANDLE_LABELS[boundary];

    return (
      <View
        accessibilityActions={[
          { label: 'Move later', name: 'increment' },
          { label: 'Move earlier', name: 'decrement' },
        ]}
        accessibilityLabel={name}
        accessibilityRole="adjustable"
        accessibilityValue={{
          text: formatLoopEditorScale(
            boundary === 'start' ? range.startMs : range.endMs,
          ),
        }}
        accessible
        onAccessibilityAction={(event: AccessibilityActionEvent) => {
          onNudgeBoundary(
            boundary,
            event.nativeEvent.actionName === 'increment' ? 'later' : 'earlier',
          );
        }}
        style={[
          styles.handle,
          {
            left: `${ratio * PERCENT}%`,
            marginLeft: -appTheme.space.touchTarget / 2,
          },
        ]}
        {...responder.panHandlers}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{badge}</Text>
        </View>
        <View style={styles.handleLine} />
      </View>
    );
  };

  return (
    <View>
      <View
        onLayout={(event: LayoutChangeEvent) => {
          setLayoutWidth(event.nativeEvent.layout.width);
        }}
        style={styles.waveform}
      >
        <View
          pointerEvents="none"
          style={[
            styles.region,
            {
              left: `${region.startRatio * PERCENT}%`,
              width: `${(region.endRatio - region.startRatio) * PERCENT}%`,
            },
          ]}
        />
        <View pointerEvents="none" style={styles.barRow}>
          {bars.map((amplitude, index) => {
            const isInside = isLoopEditorBarInRegion({
              barCount: bars.length,
              barIndex: index,
              region,
            });

            return (
              <View
                key={index}
                style={[
                  styles.bar,
                  {
                    backgroundColor: isInside
                      ? appTheme.colors.accent
                      : appTheme.colors.divider,
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
        {durationMs > 0 ? renderHandle('start', region.startRatio) : null}
        {durationMs > 0 ? renderHandle('end', region.endRatio) : null}
      </View>
      <View style={styles.scale}>
        <Text style={styles.timecode}>0:00</Text>
        <Text style={styles.timecode}>{formatLoopEditorScale(durationMs)}</Text>
      </View>
    </View>
  );
};
