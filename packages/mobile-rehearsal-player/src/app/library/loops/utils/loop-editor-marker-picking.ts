import { validateLoopRange } from '@org/audio-library-models';

import type { LoopEditorRange } from './loop-editor-model';
import type { LoopBuilderBoundary } from './saved-loop-builder-view-model';

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

export type MarkerPickResult = {
  range: LoopEditorRange;
  state: MarkerPickState;
};

/**
 * Sets the armed boundary to a marker's position and disarms. The other
 * boundary never moves, so a pick that puts the start at or after the end
 * leaves an invalid range for `getInvalidRangeMessage` to report, instead of
 * silently dragging the other handle along. With nothing armed, nothing
 * changes.
 */
export const pickMarker = (options: {
  durationMs?: number;
  positionMs: number;
  range: LoopEditorRange;
  state: MarkerPickState;
}): MarkerPickResult => {
  const { range, state } = options;

  if (!state.armed) {
    return { range, state };
  }

  const upperBound = options.durationMs ?? Number.POSITIVE_INFINITY;
  const positionMs = Math.min(
    upperBound,
    Math.max(0, Math.round(options.positionMs)),
  );

  return {
    range:
      state.armed === 'start'
        ? { endMs: range.endMs, startMs: positionMs }
        : { endMs: positionMs, startMs: range.startMs },
    state: INITIAL_MARKER_PICK_STATE,
  };
};

/** The note shown under the range cards while the range cannot be used. */
export const getInvalidRangeMessage = (
  range: LoopEditorRange,
  durationMs?: number,
): string | null => {
  const validation = validateLoopRange(range.startMs, range.endMs, durationMs);

  return validation.isValid ? null : (validation.error ?? null);
};
