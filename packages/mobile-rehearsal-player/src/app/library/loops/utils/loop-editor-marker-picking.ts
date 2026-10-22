import type { LoopEditorRange } from './loop-editor-model';
import type { LoopBuilderBoundary } from './saved-loop-view-model';

/** Which range card, if any, the next marker pick will set. */
export type MarkerPickState = { armed: LoopBuilderBoundary | null };

export const INITIAL_MARKER_PICK_STATE: MarkerPickState = { armed: null };

/** Tapping a card arms it; tapping the armed card again disarms it. */
export const toggleArmedBoundary = (
  state: MarkerPickState,
  boundary: LoopBuilderBoundary,
): MarkerPickState => {
  return { armed: state.armed === boundary ? null : boundary };
};

/** Moving the other edge, so a pick that would invert the range can proceed. */
export type MarkerPickFix = {
  boundary: LoopBuilderBoundary;
  positionMs: number;
};

export type MarkerPickClassification =
  | { kind: 'valid' }
  /**
   * The pick would put the start at or after the end (or the end at or before
   * the start). `fix` moves the other edge to the track's start or end, and is
   * null when even that cannot make a usable range.
   */
  | { fix: MarkerPickFix | null; kind: 'conflict' };

const clampToTrack = (positionMs: number, durationMs?: number) => {
  const upperBound = durationMs ?? Number.POSITIVE_INFINITY;

  return Math.min(upperBound, Math.max(0, Math.round(positionMs)));
};

/**
 * Whether setting the armed edge to a marker leaves a usable range, and when
 * not, which edge move to the track's start or end would. An edge equal to
 * the other one counts as a conflict.
 */
export const classifyMarkerPick = (options: {
  armed: LoopBuilderBoundary;
  durationMs?: number;
  positionMs: number;
  range: LoopEditorRange;
}): MarkerPickClassification => {
  const { armed, durationMs, range } = options;
  const positionMs = clampToTrack(options.positionMs, durationMs);

  if (armed === 'start') {
    if (positionMs < range.endMs) {
      return { kind: 'valid' };
    }

    // The start can only land on the marker if the end can move past it.
    return {
      fix:
        durationMs !== undefined && durationMs > positionMs
          ? { boundary: 'end', positionMs: durationMs }
          : null,
      kind: 'conflict',
    };
  }

  if (positionMs > range.startMs) {
    return { kind: 'valid' };
  }

  return {
    fix: positionMs > 0 ? { boundary: 'start', positionMs: 0 } : null,
    kind: 'conflict',
  };
};

/** The range after setting the armed edge to a marker, and optionally the fix. */
export const resolvePickedRange = (options: {
  armed: LoopBuilderBoundary;
  durationMs?: number;
  fix?: MarkerPickFix | null;
  positionMs: number;
  range: LoopEditorRange;
}): LoopEditorRange => {
  const { armed, range } = options;
  const positionMs = clampToTrack(options.positionMs, options.durationMs);
  const picked =
    armed === 'start'
      ? { endMs: range.endMs, startMs: positionMs }
      : { endMs: positionMs, startMs: range.startMs };

  if (!options.fix) {
    return picked;
  }

  return options.fix.boundary === 'start'
    ? { ...picked, startMs: options.fix.positionMs }
    : { ...picked, endMs: options.fix.positionMs };
};

export type MarkerPickConflict = {
  armed: LoopBuilderBoundary;
  fix: MarkerPickFix | null;
  /** The marker that was picked. */
  marker: { name: string; positionMs: number };
};

/** Wording for the dialog shown when a pick would invert the range. */
export const describeMarkerPickConflict = (
  conflict: MarkerPickConflict,
  range: LoopEditorRange,
  formatTime: (positionMs: number) => string,
) => {
  const { armed, fix, marker } = conflict;
  const markerLabel = `${marker.name} (${formatTime(marker.positionMs)})`;
  const reason =
    armed === 'end'
      ? `${markerLabel} is at or before the loop start (${formatTime(range.startMs)}).`
      : `${markerLabel} is at or after the loop end (${formatTime(range.endMs)}).`;

  return {
    fixLabel: fix
      ? `Move ${fix.boundary} to the track ${fix.boundary} (${formatTime(fix.positionMs)})`
      : null,
    message: fix
      ? `${reason} Move the ${fix.boundary} to the track ${fix.boundary} so this marker can be the loop ${armed}?`
      : `${reason} The other edge cannot move far enough to make room, so pick another marker.`,
    title: "This marker doesn't fit the loop",
  };
};
