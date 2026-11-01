import { formatRecordingDuration } from '@org/audio-library-models';

export type MarkerReference = { name: string; positionMs: number };

export type MarkerContext = {
  /** The marker just passed, if the position is past any. */
  passed?: MarkerReference;
  /** The marker coming up, if any is ahead. */
  next?: MarkerReference;
};

/**
 * The previous and next marker around a position (rehearsal-recording design
 * Decision 17). Read-only context: a track with no markers just has none.
 */
export const getMarkerContext = (
  markers: readonly MarkerReference[],
  positionMs: number,
): MarkerContext => {
  const ordered = [...markers].sort((a, b) => a.positionMs - b.positionMs);
  const passed = ordered.filter((m) => m.positionMs <= positionMs).at(-1);
  const next = ordered.find((m) => m.positionMs > positionMs);

  return { ...(passed ? { passed } : {}), ...(next ? { next } : {}) };
};

/** `Verse 2 · 0:38`, as shown beside the clock. */
export const formatMarkerReference = (marker: MarkerReference): string => {
  return `${marker.name} · ${formatRecordingDuration(marker.positionMs)}`;
};
