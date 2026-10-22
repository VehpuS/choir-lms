/** Flags closer together than this (in points) are drawn as one. */
export const MARKER_FLAG_MERGE_DISTANCE = 12;
/** How far from a flag a press still counts as pressing it (half a 44pt target). */
export const MARKER_FLAG_HIT_RADIUS = 22;

/** A marker as the waveform sees it: a named position, already filtered. */
export type WaveformMarker = {
  key: string;
  name: string;
  positionMs: number;
  /** `explicit` is the user's own marker; `derived` is a loop boundary. */
  kind: 'derived' | 'explicit';
  /** Formatted time, for the accessible label. */
  timeLabel: string;
  /** Drawn fainter: pressing it needs more than picking (loop editor). */
  isDimmed?: boolean;
};

export type WaveformFlag = {
  /** Key of the earliest marker, which the drawn flag points at. */
  key: string;
  x: number;
  /** A merged flag is explicit when any of its markers is. */
  kind: WaveformMarker['kind'];
  name: string;
  positionMs: number;
  /** Keys of every marker this flag stands for, earliest first. */
  memberKeys: string[];
  accessibilityLabel: string;
  /** Only when every marker it stands for is dimmed. */
  isDimmed: boolean;
};

type ResolveFlagsOptions = {
  markers: readonly WaveformMarker[];
  /** The audio range the waveform spans, in absolute audio time. */
  startMs: number;
  endMs: number;
  width: number;
};

export const resolveWaveformMarkerX = (
  positionMs: number,
  startMs: number,
  endMs: number,
  width: number,
): number => {
  return ((positionMs - startMs) / (endMs - startMs)) * width;
};

/** The audio position under a point of the waveform, for a long-press add. */
export const resolveWaveformPositionMs = (
  x: number,
  startMs: number,
  endMs: number,
  width: number,
): number => {
  if (width <= 0 || endMs <= startMs) {
    return startMs;
  }

  const ratio = Math.min(1, Math.max(0, x / width));

  return Math.round(startMs + ratio * (endMs - startMs));
};

const describeFlag = (
  earliest: WaveformMarker,
  memberCount: number,
): string => {
  const base = `${earliest.name}, ${earliest.timeLabel}`;

  return memberCount > 1 ? `${base}, and ${memberCount - 1} more` : base;
};

/**
 * Places one flag per marker inside the waveform's range, ordered left to
 * right, and merges flags closer than `MARKER_FLAG_MERGE_DISTANCE` into the
 * earliest of them. Markers outside the range have no place to be drawn.
 */
export const resolveWaveformFlags = ({
  markers,
  startMs,
  endMs,
  width,
}: ResolveFlagsOptions): WaveformFlag[] => {
  if (width <= 0 || endMs <= startMs) {
    return [];
  }

  const placed = markers
    .filter(({ positionMs }) => positionMs >= startMs && positionMs <= endMs)
    .map((marker) => ({
      marker,
      x: resolveWaveformMarkerX(marker.positionMs, startMs, endMs, width),
    }))
    .sort((left, right) => left.x - right.x);

  const groups: (typeof placed)[] = [];

  for (const entry of placed) {
    const group = groups.at(-1);
    const earliest = group?.[0];

    if (
      group &&
      earliest &&
      entry.x - earliest.x < MARKER_FLAG_MERGE_DISTANCE
    ) {
      group.push(entry);
    } else {
      groups.push([entry]);
    }
  }

  return groups.flatMap((group) => {
    const earliest = group[0];

    if (!earliest) {
      return [];
    }

    return [
      {
        key: earliest.marker.key,
        x: earliest.x,
        kind: group.some(({ marker }) => marker.kind === 'explicit')
          ? 'explicit'
          : 'derived',
        name: earliest.marker.name,
        positionMs: earliest.marker.positionMs,
        memberKeys: group.map(({ marker }) => marker.key),
        isDimmed: group.every(({ marker }) => marker.isDimmed === true),
        accessibilityLabel: describeFlag(earliest.marker, group.length),
      },
    ];
  });
};

/** The flag nearest to a press, if one is within reach. */
export const resolveNearestWaveformFlag = (
  flags: readonly WaveformFlag[],
  x: number,
  radius: number = MARKER_FLAG_HIT_RADIUS,
): WaveformFlag | null => {
  let nearest: WaveformFlag | null = null;
  let nearestDistance = radius;

  for (const flag of flags) {
    const distance = Math.abs(flag.x - x);

    if (distance <= nearestDistance) {
      nearest = flag;
      nearestDistance = distance;
    }
  }

  return nearest;
};
