import type { NamedLoop } from './rehearsal-domain.ts';
import {
  resolveMarkerOwner,
  type TrackMarker,
  compareTrackMarkers,
} from './track-markers.ts';

/** `all` shows loop-derived markers too; `mine` shows explicit markers only. */
export type MarkerListFilter = 'all' | 'mine';

export type DerivedMarkerOrigin = 'loop-start' | 'loop-end';

/** A read-only marker computed from a saved loop's boundary. */
export type DerivedLoopMarker = {
  origin: DerivedMarkerOrigin;
  loopId: string;
  name: string;
  positionMs: number;
};

export type ExplicitMarkerEntry = TrackMarker & {
  origin: 'explicit';
  key: string;
  isPastEnd: boolean;
};

export type DerivedMarkerEntry = DerivedLoopMarker & {
  key: string;
  isPastEnd: boolean;
};

export type MarkerListEntry = ExplicitMarkerEntry | DerivedMarkerEntry;

export type MarkerRange = { startMs: number; endMs: number };

type LoopMarkerSource = Pick<NamedLoop, 'id' | 'name' | 'sourceId'> &
  Pick<NamedLoop, 'startMs' | 'endMs'>;

type OwnerSource = Parameters<typeof resolveMarkerOwner>[1][number];

type DeriveLoopMarkersOptions = {
  /** The loop being edited contributes nothing: its boundaries are in flux. */
  excludeLoopId?: string;
};

/**
 * Start and end markers for every loop whose owning track is `ownerId`,
 * including loops of the track's adjusted copies. Computed on demand so
 * nothing needs syncing when a loop is created, edited, renamed, or deleted.
 */
export const deriveLoopMarkers = (
  ownerId: string,
  loops: readonly LoopMarkerSource[],
  sources: readonly OwnerSource[],
  options: DeriveLoopMarkersOptions = {},
): DerivedLoopMarker[] => {
  const derived: DerivedLoopMarker[] = [];

  for (const loop of loops) {
    if (loop.id === options.excludeLoopId) {
      continue;
    }

    const owner = resolveMarkerOwner(
      { id: loop.id, sourceId: loop.sourceId },
      sources,
    );

    if (owner?.id !== ownerId) {
      continue;
    }

    derived.push(
      {
        origin: 'loop-start',
        loopId: loop.id,
        name: `${loop.name} start`,
        positionMs: loop.startMs,
      },
      {
        origin: 'loop-end',
        loopId: loop.id,
        name: `${loop.name} end`,
        positionMs: loop.endMs,
      },
    );
  }

  return derived;
};

type BuildMarkerListInput = {
  explicit: readonly TrackMarker[];
  derived: readonly DerivedLoopMarker[];
  filter: MarkerListFilter;
  /** Loop context: only markers inside this range, inclusive, are listed. */
  range?: MarkerRange;
  /** Known audio length; markers beyond it are flagged, never dropped. */
  durationMs?: number;
};

const isInsideRange = (positionMs: number, range?: MarkerRange): boolean => {
  return !range || (positionMs >= range.startMs && positionMs <= range.endMs);
};

const compareEntries = (
  left: MarkerListEntry,
  right: MarkerListEntry,
): number => {
  if (left.positionMs !== right.positionMs) {
    return left.positionMs - right.positionMs;
  }

  // Explicit markers come first at equal positions.
  if (left.origin === 'explicit' && right.origin !== 'explicit') {
    return -1;
  }

  if (left.origin !== 'explicit' && right.origin === 'explicit') {
    return 1;
  }

  if (left.origin === 'explicit' && right.origin === 'explicit') {
    return compareTrackMarkers(left, right);
  }

  return left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
};

/** Merges explicit and derived markers into the ordered, filtered list. */
export const buildMarkerList = ({
  explicit,
  derived,
  filter,
  range,
  durationMs,
}: BuildMarkerListInput): MarkerListEntry[] => {
  const isPastEnd = (positionMs: number): boolean => {
    return durationMs !== undefined && positionMs > durationMs;
  };

  const entries: MarkerListEntry[] = explicit
    .filter((marker) => isInsideRange(marker.positionMs, range))
    .map((marker) => ({
      ...marker,
      origin: 'explicit' as const,
      key: `marker:${marker.id}`,
      isPastEnd: isPastEnd(marker.positionMs),
    }));

  if (filter === 'all') {
    for (const marker of derived) {
      if (isInsideRange(marker.positionMs, range)) {
        entries.push({
          ...marker,
          key: `${marker.loopId}:${marker.origin}`,
          isPastEnd: isPastEnd(marker.positionMs),
        });
      }
    }
  }

  return entries.sort(compareEntries);
};
