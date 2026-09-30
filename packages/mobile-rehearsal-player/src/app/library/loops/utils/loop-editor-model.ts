import {
  LOOP_BUILDER_NUDGE_STEP_MS,
  type LoopBuilderBoundary,
} from './saved-loop-builder-view-model';

/** The rehearsal jump of the editor's preview transport, as on the sheet. */
export const LOOP_EDITOR_SEEK_SECONDS = 15;

const MS_PER_SECOND = 1000;

export type LoopEditorRange = {
  endMs: number;
  startMs: number;
};

const clamp = (value: number, minimum: number, maximum: number) => {
  return Math.min(maximum, Math.max(minimum, value));
};

/** Where the A and B handles sit across the whole-track waveform, 0–1. */
export const getLoopEditorRegion = (
  range: LoopEditorRange,
  durationMs: number,
) => {
  if (!(durationMs > 0)) {
    return { endRatio: 0, startRatio: 0 };
  }

  return {
    endRatio: clamp(range.endMs / durationMs, 0, 1),
    startRatio: clamp(range.startMs / durationMs, 0, 1),
  };
};

/** A bar is inside the loop when any part of it overlaps the region. */
export const isLoopEditorBarInRegion = (options: {
  barCount: number;
  barIndex: number;
  region: { endRatio: number; startRatio: number };
}) => {
  const { barCount, barIndex, region } = options;
  const barStart = barIndex / barCount;
  const barEnd = (barIndex + 1) / barCount;

  return barEnd > region.startRatio && barStart < region.endRatio;
};

/**
 * The range after dragging one handle to `ratio` across the track. The handle
 * cannot cross the other one (a minimum gap stays between them) or leave the
 * track, and lands on the nudge grid so dragged and nudged values agree.
 */
export const resolveLoopEditorHandleDrag = (options: {
  boundary: LoopBuilderBoundary;
  durationMs: number;
  minimumGapMs?: number;
  range: LoopEditorRange;
  ratio: number;
}): LoopEditorRange => {
  const { boundary, durationMs, range, ratio } = options;
  const minimumGapMs = options.minimumGapMs ?? LOOP_BUILDER_NUDGE_STEP_MS;
  const snappedMs =
    Math.round((clamp(ratio, 0, 1) * durationMs) / LOOP_BUILDER_NUDGE_STEP_MS) *
    LOOP_BUILDER_NUDGE_STEP_MS;

  if (boundary === 'start') {
    return {
      endMs: range.endMs,
      startMs: clamp(snappedMs, 0, Math.max(0, range.endMs - minimumGapMs)),
    };
  }

  return {
    endMs: clamp(
      snappedMs,
      Math.min(durationMs, range.startMs + minimumGapMs),
      durationMs,
    ),
    startMs: range.startMs,
  };
};

/** The ratio a handle sits at, for starting a drag from where it is. */
export const getLoopEditorHandleRatio = (
  boundary: LoopBuilderBoundary,
  region: { endRatio: number; startRatio: number },
) => {
  return boundary === 'start' ? region.startRatio : region.endRatio;
};

/** Seek target inside the previewed range for the editor's ±15 s controls. */
export const resolveLoopEditorSeekTarget = (options: {
  deltaSeconds: number;
  positionSeconds: number;
  range: LoopEditorRange;
}) => {
  return clamp(
    options.positionSeconds + options.deltaSeconds,
    options.range.startMs / MS_PER_SECOND,
    options.range.endMs / MS_PER_SECOND,
  );
};

/** Which nudge buttons are spent, given the range and the track length. */
export const getLoopEditorNudgeAvailability = (options: {
  range: LoopEditorRange;
  trackDurationMs: number | null;
}) => {
  const { range, trackDurationMs } = options;

  return {
    endEarlier: range.endMs <= range.startMs + LOOP_BUILDER_NUDGE_STEP_MS,
    endLater: trackDurationMs !== null && range.endMs >= trackDurationMs,
    startEarlier: range.startMs <= 0,
    startLater: range.startMs >= range.endMs - LOOP_BUILDER_NUDGE_STEP_MS,
  };
};

/** Where the preview playhead sits across the whole track, 0–1. */
export const getLoopEditorPlayheadRatio = (options: {
  durationMs: number;
  positionSeconds: number;
  range: LoopEditorRange;
}) => {
  if (!(options.durationMs > 0)) {
    return 0;
  }

  return clamp(
    clamp(
      options.positionSeconds * MS_PER_SECOND,
      options.range.startMs,
      options.range.endMs,
    ) / options.durationMs,
    0,
    1,
  );
};
