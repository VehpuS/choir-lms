import type { RecordingPunch } from '@org/audio-library-models';

/**
 * The punch range as a value and the rules for editing it (rehearsal-recording
 * design Decision 18): an `In` and an `Out` point that automatic recording
 * starts and stops on, a pre-roll before `In`, and the shortcuts and snapping
 * the setup sheet offers. Everything here is a pure function, so the sheet
 * only draws and the rules are tested without one.
 */

export const MAX_PRE_ROLL_MS = 10_000;
export const DEFAULT_PRE_ROLL_MS = 3_000;
export const PRE_ROLL_STEP_MS = 1_000;
export const SMALL_NUDGE_MS = 100;
export const LARGE_NUDGE_MS = 1_000;
/** A recording under one second is discarded, so a range shorter than that cannot be armed. */
export const MIN_PUNCH_MS = 1_000;
/** How far from a point a marker's name is still shown beside it. */
export const NEAR_MARKER_MS = 3_000;

const MS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const TENTH_MS = 100;
const TIME_PATTERN = /^(?:(\d+):)?(\d+)(?:\.(\d{1,3}))?$/;

export type PunchMarker = { name: string; positionMs: number };
export type PunchLoop = {
  id: string;
  name: string;
  startMs: number;
  endMs: number;
};

export type PunchDraft = {
  inMs: number | null;
  outMs: number | null;
  preRollMs: number;
  keepPlayingAfterOut: boolean;
  /** Set while the points are still the active loop's, so the take is a loop recording. */
  loop?: PunchLoop;
};

export const createPunchDraft = (): PunchDraft => ({
  inMs: null,
  keepPlayingAfterOut: false,
  outMs: null,
  preRollMs: DEFAULT_PRE_ROLL_MS,
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Keeps the loop only while both points still match it. */
const withLoopIfMatching = (draft: PunchDraft): PunchDraft => {
  const { loop, ...rest } = draft;

  return loop && draft.inMs === loop.startMs && draft.outMs === loop.endMs
    ? draft
    : rest;
};

export type PunchPoint = 'in' | 'out';

export const setPunchPoint = (
  draft: PunchDraft,
  point: PunchPoint,
  ms: number,
  trackDurationMs?: number,
): PunchDraft =>
  withLoopIfMatching({
    ...draft,
    [point === 'in' ? 'inMs' : 'outMs']: clamp(
      Math.round(ms),
      0,
      trackDurationMs ?? Number.POSITIVE_INFINITY,
    ),
  });

export const nudgePunchPoint = (
  draft: PunchDraft,
  point: PunchPoint,
  deltaMs: number,
  trackDurationMs?: number,
): PunchDraft => {
  const current = point === 'in' ? draft.inMs : draft.outMs;

  return current === null
    ? draft
    : setPunchPoint(draft, point, current + deltaMs, trackDurationMs);
};

export const applyActiveLoop = (
  draft: PunchDraft,
  loop: PunchLoop,
): PunchDraft => ({
  ...draft,
  inMs: loop.startMs,
  loop,
  outMs: loop.endMs,
});

/** `Use current position` sets `In` to the playhead. */
export const applyCurrentPosition = (
  draft: PunchDraft,
  positionMs: number,
  trackDurationMs?: number,
): PunchDraft => setPunchPoint(draft, 'in', positionMs, trackDurationMs);

export const setPreRoll = (
  draft: PunchDraft,
  preRollMs: number,
): PunchDraft => ({
  ...draft,
  preRollMs: clamp(Math.round(preRollMs), 0, MAX_PRE_ROLL_MS),
});

export const stepPreRoll = (draft: PunchDraft, direction: 1 | -1): PunchDraft =>
  setPreRoll(draft, draft.preRollMs + direction * PRE_ROLL_STEP_MS);

/** `m:ss.s`, for the time fields and the summary. */
export const formatPunchTime = (ms: number): string => {
  const tenths = Math.floor(Math.max(0, ms) / TENTH_MS);
  const wholeSeconds = Math.floor(tenths / 10);
  const minutes = Math.floor(wholeSeconds / SECONDS_PER_MINUTE);
  const seconds = wholeSeconds % SECONDS_PER_MINUTE;

  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths % 10}`;
};

/** A typed time: `1:23`, `1:23.5`, `83` or `83.25`; `null` when it is not one. */
export const parsePunchTime = (text: string): number | null => {
  const match = TIME_PATTERN.exec(text.trim());

  if (!match) {
    return null;
  }

  const [, minutes, seconds, fraction] = match;
  const secondsValue = Number(seconds);

  // With minutes given, seconds are a clock field; without, they may be any number.
  if (minutes !== undefined && secondsValue >= SECONDS_PER_MINUTE) {
    return null;
  }

  const fractionMs = fraction ? Number(fraction.padEnd(3, '0')) : 0;

  return (
    (Number(minutes ?? 0) * SECONDS_PER_MINUTE + secondsValue) * MS_PER_SECOND +
    fractionMs
  );
};

export type SnapTarget = {
  ms: number;
  label: string;
  kind: 'marker' | 'loop-start' | 'loop-end';
};

/** Where a dragged handle snaps: every marker and, when there is one, the loop's two ends. */
export const getSnapTargets = (input: {
  markers: readonly PunchMarker[];
  loop?: PunchLoop;
}): SnapTarget[] => [
  ...input.markers.map(
    ({ name, positionMs }): SnapTarget => ({
      kind: 'marker',
      label: name,
      ms: positionMs,
    }),
  ),
  ...(input.loop
    ? ([
        {
          kind: 'loop-start',
          label: `${input.loop.name} start`,
          ms: input.loop.startMs,
        },
        {
          kind: 'loop-end',
          label: `${input.loop.name} end`,
          ms: input.loop.endMs,
        },
      ] satisfies SnapTarget[])
    : []),
];

/** The nearest target within the tolerance (the sheet turns its few pixels into milliseconds), else the point as given. */
export const snapPunchPoint = (
  ms: number,
  targets: readonly SnapTarget[],
  toleranceMs: number,
): { ms: number; snappedTo?: SnapTarget } => {
  let nearest: SnapTarget | undefined;

  for (const target of targets) {
    const distance = Math.abs(target.ms - ms);

    if (
      distance <= toleranceMs &&
      (!nearest || distance < Math.abs(nearest.ms - ms))
    ) {
      nearest = target;
    }
  }

  return nearest ? { ms: nearest.ms, snappedTo: nearest } : { ms };
};

/** The marker whose name to show beside a point, if one is close. */
export const getNearestMarkerName = (
  ms: number,
  markers: readonly PunchMarker[],
  withinMs: number = NEAR_MARKER_MS,
): string | undefined => {
  let nearest: PunchMarker | undefined;

  for (const marker of markers) {
    const distance = Math.abs(marker.positionMs - ms);

    if (
      distance <= withinMs &&
      (!nearest || distance < Math.abs(nearest.positionMs - ms))
    ) {
      nearest = marker;
    }
  }

  return nearest?.name;
};

export type PunchInvalidReason =
  | 'incomplete'
  | 'out-not-after-in'
  | 'too-short'
  | 'past-end';

/** Why arming is unavailable, in words the sheet shows beside it. */
export const PUNCH_INVALID_MESSAGES: Record<PunchInvalidReason, string> = {
  incomplete: 'Set the `In` and `Out` points.',
  'out-not-after-in': '`Out` must be after `In`.',
  'too-short': 'The range must be at least one second long.',
  'past-end': '`Out` is past the end of the track.',
};

export type PunchValidity =
  | { valid: true; lengthMs: number }
  | { valid: false; reason: PunchInvalidReason };

export const getPunchValidity = (
  draft: PunchDraft,
  trackDurationMs?: number,
): PunchValidity => {
  if (draft.inMs === null || draft.outMs === null) {
    return { reason: 'incomplete', valid: false };
  }

  if (draft.outMs <= draft.inMs) {
    return { reason: 'out-not-after-in', valid: false };
  }

  if (draft.outMs - draft.inMs < MIN_PUNCH_MS) {
    return { reason: 'too-short', valid: false };
  }

  if (trackDurationMs !== undefined && draft.outMs > trackDurationMs) {
    return { reason: 'past-end', valid: false };
  }

  return { lengthMs: draft.outMs - draft.inMs, valid: true };
};

/** A draft that passed `getPunchValidity`, with both points set. */
export type PunchRange = {
  inMs: number;
  outMs: number;
  preRollMs: number;
  keepPlayingAfterOut: boolean;
  loop?: PunchLoop;
};

export const toPunchRange = (
  draft: PunchDraft,
  trackDurationMs?: number,
): PunchRange | null =>
  getPunchValidity(draft, trackDurationMs).valid &&
  draft.inMs !== null &&
  draft.outMs !== null
    ? {
        inMs: draft.inMs,
        keepPlayingAfterOut: draft.keepPlayingAfterOut,
        ...(draft.loop ? { loop: draft.loop } : {}),
        outMs: draft.outMs,
        preRollMs: draft.preRollMs,
      }
    : null;

/** Where playback starts when armed: the pre-roll before `In`, never before the start of the track. */
export const getPlayFromMs = (range: Pick<PunchRange, 'inMs' | 'preRollMs'>) =>
  Math.max(0, range.inMs - range.preRollMs);

/** What is stored on the recording. */
export const toRecordingPunch = (range: PunchRange): RecordingPunch => ({
  inMs: range.inMs,
  outMs: range.outMs,
  preRollMs: range.preRollMs,
});
