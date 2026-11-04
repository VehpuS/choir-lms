import {
  PUNCH_INVALID_MESSAGES,
  formatPunchTime,
  getNearestMarkerName,
  getPunchValidity,
  getSnapTargets,
  parsePunchTime,
  setPunchPoint,
  snapPunchPoint,
  type PunchDraft,
  type PunchLoop,
  type PunchMarker,
  type PunchPoint,
} from '@org/audio-mixing';

/** How close, in points on the waveform, a dragged handle must be to a marker to snap to it. */
export const PUNCH_SNAP_PX = 10;

const MS_PER_SECOND = 1000;
const EMPTY_TIME = '–:––';

export const PUNCH_SHEET_COPY = {
  armLabel: 'Arm',
  cancelLabel: 'Cancel',
  keepPlayingLabel: 'Keep playing after “Out”',
  preRollLabel: 'Pre-roll',
  subtitle:
    'Drag the handles, tap a marker flag (first tap sets “In”, second sets “Out”), or type a time. Recording starts and stops by itself.',
  title: 'Record between markers',
  useLoopLabel: 'Use active loop',
  usePositionLabel: 'Use current position as “In”',
} as const;

export type PunchSheetInput = {
  draft: PunchDraft;
  markers: readonly PunchMarker[];
  trackDurationMs?: number;
};

export type PunchPointView = {
  /** `m:ss.s`, or a dash placeholder while the point is not set. */
  text: string;
  /** The marker the point sits near, e.g. `near Chorus`. */
  near?: string;
  /** Where the handle sits across the track, 0 to 1; absent while not set. */
  ratio?: number;
};

export type PunchSheetModel = {
  inView: PunchPointView;
  outView: PunchPointView;
  preRollText: string;
  /** The summary of what arming does, or why it cannot yet be armed. */
  note: { text: string; isProblem: boolean };
  canArm: boolean;
};

const toRatio = (ms: number | null, durationMs?: number) =>
  ms === null || !durationMs || durationMs <= 0
    ? undefined
    : Math.min(1, Math.max(0, ms / durationMs));

const pointView = (
  ms: number | null,
  markers: readonly PunchMarker[],
  durationMs?: number,
): PunchPointView => {
  const near = ms === null ? undefined : getNearestMarkerName(ms, markers);

  return {
    ...(near ? { near: `near ${near}` } : {}),
    ...(toRatio(ms, durationMs) === undefined
      ? {}
      : { ratio: toRatio(ms, durationMs) }),
    text: ms === null ? EMPTY_TIME : formatPunchTime(ms),
  };
};

const formatSeconds = (ms: number) => `${Math.round(ms / MS_PER_SECOND)} s`;

/** The range as marker names when both ends are near one, else as times. */
export const getPunchSpanText = (
  inMs: number,
  outMs: number,
  markers: readonly PunchMarker[],
) => {
  const from = getNearestMarkerName(inMs, markers);
  const to = getNearestMarkerName(outMs, markers);

  return from && to
    ? `${from} → ${to}`
    : `${formatPunchTime(inMs)} → ${formatPunchTime(outMs)}`;
};

export const getPunchSheetModel = (input: PunchSheetInput): PunchSheetModel => {
  const { draft, markers, trackDurationMs } = input;
  const validity = getPunchValidity(draft, trackDurationMs);
  const preRollText = formatSeconds(draft.preRollMs);
  const note =
    validity.valid && draft.inMs !== null && draft.outMs !== null
      ? {
          isProblem: false,
          text: [
            `Records ${formatSeconds(validity.lengthMs)} · ${getPunchSpanText(draft.inMs, draft.outMs, markers)}.`,
            `Press play and it starts ${preRollText} before ${formatPunchTime(draft.inMs)}, records from ${formatPunchTime(draft.inMs)} to ${formatPunchTime(draft.outMs)}.`,
          ].join(' '),
        }
      : {
          isProblem: true,
          text: validity.valid
            ? ''
            : PUNCH_INVALID_MESSAGES[validity.reason].replaceAll('`', ''),
        };

  return {
    canArm: validity.valid,
    inView: pointView(draft.inMs, markers, trackDurationMs),
    note,
    outView: pointView(draft.outMs, markers, trackDurationMs),
    preRollText,
  };
};

/**
 * A tap on a marker flag: the first sets `In`, the next `Out`, then they
 * alternate. Returns the point the following tap will set.
 */
export const applyFlagTap = (
  draft: PunchDraft,
  positionMs: number,
  next: PunchPoint,
  trackDurationMs?: number,
): { draft: PunchDraft; next: PunchPoint } => ({
  draft: setPunchPoint(draft, next, positionMs, trackDurationMs),
  next: next === 'in' ? 'out' : 'in',
});

/** A handle dragged to `ratio` across the waveform, snapped to a marker or a loop end close to it. */
export const applyHandleDrag = (input: {
  draft: PunchDraft;
  point: PunchPoint;
  ratio: number;
  trackDurationMs: number;
  widthPx: number;
  markers: readonly PunchMarker[];
  loop?: PunchLoop;
}): PunchDraft => {
  const { draft, point, ratio, trackDurationMs, widthPx } = input;

  if (!(trackDurationMs > 0) || !(widthPx > 0)) {
    return draft;
  }

  const ms = Math.min(1, Math.max(0, ratio)) * trackDurationMs;
  const toleranceMs = (PUNCH_SNAP_PX / widthPx) * trackDurationMs;
  const snapped = snapPunchPoint(
    ms,
    getSnapTargets({ loop: input.loop, markers: input.markers }),
    toleranceMs,
  );

  return setPunchPoint(draft, point, snapped.ms, trackDurationMs);
};

/** A typed time for one point; text that is not a time leaves the draft as it was. */
export const applyTypedTime = (
  draft: PunchDraft,
  point: PunchPoint,
  text: string,
  trackDurationMs?: number,
): PunchDraft => {
  const ms = parsePunchTime(text);

  return ms === null ? draft : setPunchPoint(draft, point, ms, trackDurationMs);
};
