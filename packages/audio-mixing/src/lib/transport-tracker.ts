import type { RecordingTimelineSegment } from '@org/audio-library-models';

import { fitClockAnchors, type ClockAnchor } from './anchor-fit.ts';
import {
  buildRecordingTimeline,
  type TrackStateChange,
} from './recording-timeline-builder.ts';
import type { SyncTimers, Transport } from './sync-controller.ts';

/**
 * Watches the track while a recording runs and turns what it sees into the
 * recording's timeline (rehearsal-recording design Decisions 2 and 9). Each
 * uninterrupted stretch of playback is fitted against `nowMs` so sampling
 * jitter is averaged out; a pause, resume, seek or loop wrap starts a new
 * stretch, and so does a position that jumps away from the fit (a wrap the
 * player did not announce).
 */

const DEFAULT_SAMPLE_MS = 100;
/** Larger than the media element's own timing jitter, smaller than any seek. */
const DEFAULT_JUMP_TOLERANCE_MS = 150;
/** Recent anchors are enough for an offset fit and bound memory on long takes. */
const MAX_ANCHORS_PER_STRETCH = 40;

type Stretch = {
  startWallMs: number;
  playing: boolean;
  anchors: ClockAnchor[];
};

export type TransportTrackerOptions = {
  transport: Transport;
  /** Track milliseconds per wall millisecond, fixed for the recording. */
  rate: number;
  /** Output plus input latency applied to the timeline (Decision 3). */
  latencyMs: number;
  /** Wall clock, `performance.now()` in the app. */
  nowMs: () => number;
  timers?: SyncTimers;
  sampleMs?: number;
  jumpToleranceMs?: number;
};

export type TransportTracker = {
  /**
   * Sets the wall time of the recording's first sample. Until it is set the
   * recording is taken to start with the tracker.
   */
  setOriginWallMs: (wallMs: number) => void;
  /** The timeline for a recording that has run for `elapsedMs`. */
  getTimeline: (elapsedMs: number) => RecordingTimelineSegment[];
  dispose: () => void;
};

const defaultTimers: SyncTimers = {
  setInterval: (callback, ms) => globalThis.setInterval(callback, ms),
  clearInterval: (handle) =>
    globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
};

export const createTransportTracker = (
  options: TransportTrackerOptions,
): TransportTracker => {
  const { transport, rate, latencyMs, nowMs } = options;
  const timers = options.timers ?? defaultTimers;
  const jumpToleranceMs = options.jumpToleranceMs ?? DEFAULT_JUMP_TOLERANCE_MS;
  const stretches: Stretch[] = [];
  let originWallMs: number | null = null;

  const trackAt = (stretch: Stretch, wallMs: number): number => {
    const last = stretch.anchors[stretch.anchors.length - 1];

    if (!last) {
      return 0;
    }

    if (!stretch.playing) {
      return last.trackMs;
    }

    return (
      fitClockAnchors(stretch.anchors, rate)?.trackAt(wallMs) ?? last.trackMs
    );
  };

  const beginStretch = () => {
    const wallMs = nowMs();

    stretches.push({
      startWallMs: wallMs,
      playing: transport.isPlaying(),
      anchors: [{ wallMs, trackMs: transport.getPositionMs() }],
    });
  };

  const sample = () => {
    const current = stretches[stretches.length - 1];

    if (!current?.playing) {
      return;
    }

    const wallMs = nowMs();
    const trackMs = transport.getPositionMs();

    if (Math.abs(trackAt(current, wallMs) - trackMs) > jumpToleranceMs) {
      beginStretch();

      return;
    }

    current.anchors.push({ wallMs, trackMs });

    if (current.anchors.length > MAX_ANCHORS_PER_STRETCH) {
      current.anchors.shift();
    }
  };

  beginStretch();

  const unsubscribe = transport.subscribe(beginStretch);
  const handle = timers.setInterval(
    sample,
    options.sampleMs ?? DEFAULT_SAMPLE_MS,
  );

  const getChanges = (): TrackStateChange[] => {
    const origin = originWallMs ?? stretches[0]?.startWallMs ?? 0;
    // The stretch running at the origin is the last one that began by then.
    let firstIndex = 0;

    stretches.forEach((stretch, index) => {
      if (stretch.startWallMs <= origin) {
        firstIndex = index;
      }
    });

    // Time with the track paused is not part of the take: the recorder drops
    // that audio, so every later change moves earlier by the pause before it.
    let pausedMs = 0;
    const changes: TrackStateChange[] = [];

    stretches.slice(firstIndex).forEach((stretch, index, kept) => {
      const atWallMs = index === 0 ? origin : stretch.startWallMs;

      if (!stretch.playing) {
        const endWallMs = kept[index + 1]?.startWallMs ?? atWallMs;

        pausedMs += endWallMs - atWallMs;

        return;
      }

      changes.push({
        atMs: atWallMs - origin - pausedMs,
        trackMs: trackAt(stretch, atWallMs),
        playing: true,
      });
    });

    return changes;
  };

  return {
    setOriginWallMs: (wallMs) => {
      originWallMs = wallMs;
    },
    getTimeline: (elapsedMs) =>
      buildRecordingTimeline({
        changes: getChanges(),
        rate,
        latencyMs,
        durationMs: elapsedMs,
      }),
    dispose: () => {
      unsubscribe();
      timers.clearInterval(handle);
    },
  };
};
