import { resolveLyricsOwner } from './source-lyrics.ts';

export const MAX_TRACK_MARKERS = 200;
export const MAX_MARKER_NAME_LENGTH = 60;

const AUTOMATIC_MARKER_NAME_PATTERN = /^Marker (\d+)$/;

/**
 * A named point in a saved track. `positionMs` is in the original audio's
 * time, never in shaped (speed or pitch adjusted) time.
 */
export type TrackMarker = {
  id: string;
  name: string;
  positionMs: number;
  createdAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

export const compareTrackMarkers = (
  left: Pick<TrackMarker, 'positionMs' | 'createdAt'>,
  right: Pick<TrackMarker, 'positionMs' | 'createdAt'>,
): number => {
  if (left.positionMs !== right.positionMs) {
    return left.positionMs - right.positionMs;
  }

  if (left.createdAt === right.createdAt) {
    return 0;
  }

  return left.createdAt < right.createdAt ? -1 : 1;
};

/** Trims a typed name and caps it; an empty result means "no usable name". */
export const normalizeMarkerName = (name: string): string => {
  return name.trim().slice(0, MAX_MARKER_NAME_LENGTH).trim();
};

/**
 * The smallest positive `Marker N` not already used, so automatic names fill
 * gaps instead of growing forever.
 */
export const nextAutomaticMarkerName = (
  existingNames: readonly string[],
): string => {
  const used = new Set<number>();

  for (const name of existingNames) {
    const match = AUTOMATIC_MARKER_NAME_PATTERN.exec(name);

    if (match?.[1]) {
      used.add(Number(match[1]));
    }
  }

  let candidate = 1;

  while (used.has(candidate)) {
    candidate += 1;
  }

  return `Marker ${candidate}`;
};

type ParsedMarker = {
  id: string;
  name: string;
  positionMs: number;
  createdAt: string;
};

const parseMarkerEntry = (value: unknown): ParsedMarker | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    typeof value.createdAt !== 'string' ||
    typeof value.positionMs !== 'number' ||
    !Number.isFinite(value.positionMs) ||
    value.positionMs < 0
  ) {
    return null;
  }

  return {
    id: value.id,
    // A missing or blank name is repaired once the whole list is known.
    name: typeof value.name === 'string' ? normalizeMarkerName(value.name) : '',
    positionMs: Math.round(value.positionMs),
    createdAt: value.createdAt,
  };
};

/**
 * Reads a stored `markers` value. Malformed entries (bad position, missing id
 * or timestamp, duplicate id) are dropped, blank names become `Marker N`, the
 * list is ordered by position then creation time and capped at
 * `MAX_TRACK_MARKERS`. An empty result is `undefined` so callers remove the
 * field instead of storing an empty list.
 */
export const parseTrackMarkers = (
  value: unknown,
): TrackMarker[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seenIds = new Set<string>();
  const entries: ParsedMarker[] = [];

  for (const raw of value) {
    const entry = parseMarkerEntry(raw);

    if (!entry || seenIds.has(entry.id)) {
      continue;
    }

    seenIds.add(entry.id);
    entries.push(entry);
  }

  const usedNames = entries.map((entry) => entry.name);
  const markers = entries.map((entry): TrackMarker => {
    if (entry.name.length > 0) {
      return entry;
    }

    const name = nextAutomaticMarkerName(usedNames);
    usedNames.push(name);

    return { ...entry, name };
  });

  markers.sort(compareTrackMarkers);

  const capped = markers.slice(0, MAX_TRACK_MARKERS);

  return capped.length > 0 ? capped : undefined;
};

type MarkerOwnerSource = Parameters<typeof resolveLyricsOwner>[1][number];
type MarkerOwnerItem = Parameters<typeof resolveLyricsOwner>[0];

/**
 * Finds the saved track that owns the markers shown for a track, an adjusted
 * track, a loop, or a loop of an adjusted track. Markers share the lyrics and
 * sheet music ownership rules; returns `null` when the owner no longer exists.
 */
export const resolveMarkerOwner = <Source extends MarkerOwnerSource>(
  item: MarkerOwnerItem,
  sources: readonly Source[],
): Source | null => {
  return resolveLyricsOwner(item, sources);
};
