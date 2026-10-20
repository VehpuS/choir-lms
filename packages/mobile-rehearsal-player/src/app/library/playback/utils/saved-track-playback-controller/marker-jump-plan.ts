import type { PlayableItem } from '@org/audio-library-models';

export type MarkerJumpPlan =
  /** The marker lies beyond the known audio length; nothing is played. */
  | { kind: 'refused'; reason: 'past-end' }
  /** The owner is already loaded: move within it and keep its play state. */
  | { kind: 'seek'; positionSeconds: number }
  /** Not loaded: load the item the list was opened from and start there. */
  | { kind: 'load'; positionSeconds: number };

/** The saved track that owns the audio an item plays (design Decision 2). */
export const getPlayableItemMarkerOwnerId = (item: PlayableItem): string => {
  return item.source.adjustment?.sourceRef ?? item.source.id;
};

const clamp = (value: number, min: number, max: number | null): number => {
  const atLeastMin = Math.max(min, value);

  return max === null ? atLeastMin : Math.min(atLeastMin, max);
};

const isInsideRange = (positionMs: number, item: PlayableItem): boolean => {
  return (
    positionMs >= item.range.startMs &&
    (item.range.endMs === null || positionMs <= item.range.endMs)
  );
};

/**
 * Decides how a tap on a marker plays out. `target` is the item the markers
 * list was opened from (its range is the loop window in a loop context);
 * `active` is whatever is loaded now. Positions are absolute audio time, the
 * same time the player seeks in, so shaping never changes them.
 */
export const planMarkerJump = (options: {
  active: PlayableItem | null;
  positionMs: number;
  target: PlayableItem;
}): MarkerJumpPlan => {
  const { active, positionMs, target } = options;
  const durationMs = target.source.durationMs;

  if (durationMs !== undefined && positionMs > durationMs) {
    return { kind: 'refused', reason: 'past-end' };
  }

  // A marker that slipped past a loop's window plays from the window's edge.
  const targetPositionMs = clamp(
    positionMs,
    target.range.startMs,
    target.range.endMs,
  );

  if (
    active &&
    getPlayableItemMarkerOwnerId(active) ===
      getPlayableItemMarkerOwnerId(target) &&
    isInsideRange(targetPositionMs, active)
  ) {
    return { kind: 'seek', positionSeconds: targetPositionMs / 1000 };
  }

  return { kind: 'load', positionSeconds: targetPositionMs / 1000 };
};
