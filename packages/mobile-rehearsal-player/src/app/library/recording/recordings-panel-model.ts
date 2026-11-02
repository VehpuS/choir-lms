import {
  formatRecordingDuration,
  formatRecordingSize,
  getRecordingPlacements,
  type DriveAudioSource,
  type PlayableItem,
  type Recording,
  type RecordingLibrary,
  type RecordingPlacement,
} from '@org/audio-library-models';

import {
  describeRecordingSpan,
  formatRecordingShaping,
} from './recording-description';
import {
  findRecordingTrack,
  recordingNeedsConnection,
  resolveRecordingOfflineAction,
  type RecordingOfflineAction,
  type RecordingOfflineContext,
} from './recording-offline';

/**
 * What the Recordings panel lists for the track, adjusted track or loop that
 * is playing (rehearsal-recording design Decision 10): the plain list and a
 * `Loops` section grouped by loop, each row with its tags. Where a recording
 * is listed comes from the stored lineage through `getRecordingPlacements`;
 * this only picks the placements that belong to the entity being viewed.
 */

export const RECORDINGS_MENU_LABEL = 'Recordings';
export const ORIGINAL_CHANGED_TAG = 'Original changed';
export const NEEDS_CONNECTION_TAG = 'Needs connection';
export const PUNCH_TAG = 'Punch';
export const NO_SHAPING_LABEL = 'Original speed and pitch';
export const EMPTY_LIST_MESSAGE = 'None yet.';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LOOPS_SECTION_TITLE = 'Loops';

/** The entity whose recordings are shown, from what is playing. */
export type RecordingsView =
  | { kind: 'track'; sourceId: string }
  | { kind: 'adjusted'; sourceId: string }
  | { kind: 'loop'; loopId: string };

export const getRecordingsView = (
  item: Pick<PlayableItem, 'kind' | 'loopId' | 'source'>,
): RecordingsView => {
  if (item.kind === 'loop' && item.loopId) {
    return { kind: 'loop', loopId: item.loopId };
  }

  return {
    kind: item.source.adjustment ? 'adjusted' : 'track',
    sourceId: item.source.id,
  };
};

export type RecordingTag = {
  kind: 'loop' | 'punch' | 'adjusted' | 'changed' | 'connection';
  label: string;
};

export type RecordingRow = {
  id: string;
  name: string;
  tags: RecordingTag[];
  /** `Verse 2 → Chorus · 0:42 · 3.6 MB`. */
  detail: string;
  /** `Today · 0.7×, +2`. */
  meta: string;
  offline: RecordingOfflineAction;
};

export type RecordingsLoopGroup = {
  loopId: string;
  name: string;
  rows: RecordingRow[];
};

export type RecordingsPanelModel = {
  title: string;
  subtitle: string;
  mainTitle: string;
  main: RecordingRow[];
  /** Only for a track or adjusted track; a loop view has no `Loops` section. */
  loopsTitle: string;
  loops: RecordingsLoopGroup[];
  count: number;
  emptyMessage: string;
};

export type RecordingsPanelInput = {
  view: RecordingsView;
  /** The name of the viewed entity, for the heading. */
  viewName: string;
  recordings: readonly Recording[];
  library: RecordingLibrary;
  offline: RecordingOfflineContext;
  /** Wall clock for `Today` and `Yesterday`. */
  now: Date;
};

const isInView = (
  placement: RecordingPlacement,
  view: RecordingsView,
): 'main' | 'loops' | null => {
  if (view.kind === 'loop') {
    return placement.surface === 'loop' && placement.entityId === view.loopId
      ? 'main'
      : null;
  }

  const mainSurface = view.kind === 'adjusted' ? 'adjusted-main' : 'track-main';
  const loopsSurface =
    view.kind === 'adjusted' ? 'adjusted-loops' : 'track-loops';

  if (
    placement.surface === mainSurface &&
    placement.entityId === view.sourceId
  ) {
    return 'main';
  }

  return placement.surface === loopsSurface &&
    placement.entityId === view.sourceId
    ? 'loops'
    : null;
};

/** `Today`, `Yesterday`, or the date, so a list reads without clock times. */
export const formatRecordedAt = (createdAt: string, now: Date): string => {
  const created = new Date(createdAt);

  if (Number.isNaN(created.getTime())) {
    return '';
  }

  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysAgo = Math.round(
    (startOfDay(now) - startOfDay(created)) / MS_PER_DAY,
  );

  if (daysAgo === 0) {
    return 'Today';
  }

  return daysAgo === 1 ? 'Yesterday' : created.toLocaleDateString();
};

/** The track changed on Drive since the recording was made against it. */
export const isOriginalChanged = (
  recording: Recording,
  sources: readonly DriveAudioSource[],
): boolean => {
  const track = findRecordingTrack(recording, sources);
  const recorded = recording.source.contentVersion;

  return (
    track?.modifiedTime !== undefined &&
    recorded !== undefined &&
    track.modifiedTime !== recorded
  );
};

const getTags = (
  recording: Recording,
  offline: RecordingOfflineContext,
): RecordingTag[] => {
  const { adjusted, loop } = recording.lineage;
  const shaping = formatRecordingShaping(recording.shaping);

  return [
    ...(loop ? [{ kind: 'loop' as const, label: `Loop · ${loop.name}` }] : []),
    ...(recording.punch ? [{ kind: 'punch' as const, label: PUNCH_TAG }] : []),
    ...(adjusted && shaping
      ? [{ kind: 'adjusted' as const, label: shaping }]
      : []),
    ...(isOriginalChanged(recording, offline.sources)
      ? [{ kind: 'changed' as const, label: ORIGINAL_CHANGED_TAG }]
      : []),
    ...(recordingNeedsConnection(recording, offline.stateOf)
      ? [{ kind: 'connection' as const, label: NEEDS_CONNECTION_TAG }]
      : []),
  ];
};

export const toRecordingRow = (
  recording: Recording,
  offline: RecordingOfflineContext,
  now: Date,
): RecordingRow => ({
  id: recording.id,
  name: recording.name,
  tags: getTags(recording, offline),
  detail: [
    describeRecordingSpan(recording),
    formatRecordingDuration(recording.durationMs),
    formatRecordingSize(recording.sizeBytes),
  ].join(' · '),
  meta: [
    formatRecordedAt(recording.createdAt, now),
    formatRecordingShaping(recording.shaping) ?? NO_SHAPING_LABEL,
  ]
    .filter(Boolean)
    .join(' · '),
  offline: resolveRecordingOfflineAction([recording], offline),
});

const VIEW_COPY = {
  track: { main: 'This track', subtitle: 'stored on this device' },
  adjusted: { main: 'This adjusted track', subtitle: 'stored on this device' },
  loop: { main: 'This loop', subtitle: 'stored on this device' },
} as const;

/** Newest first, as the store lists them. */
const byNewest = (a: Recording, b: Recording) =>
  b.createdAt.localeCompare(a.createdAt);

export const getRecordingsPanelModel = (
  input: RecordingsPanelInput,
): RecordingsPanelModel => {
  const { library, now, offline, recordings, view } = input;
  const main: Recording[] = [];
  const loops = new Map<string, { name: string; items: Recording[] }>();

  [...recordings].sort(byNewest).forEach((recording) => {
    const where = getRecordingPlacements(recording, library)
      .map((placement) => ({ placement, area: isInView(placement, view) }))
      .find(({ area }) => area !== null);

    if (!where) {
      return;
    }

    if (where.area === 'main') {
      main.push(recording);

      return;
    }

    const loopId =
      where.placement.surface === 'track-loops' ||
      where.placement.surface === 'adjusted-loops'
        ? where.placement.loopId
        : '';
    const group = loops.get(loopId) ?? {
      name: recording.lineage.loop?.name ?? '',
      items: [],
    };

    group.items.push(recording);
    loops.set(loopId, group);
  });

  const toRows = (items: readonly Recording[]) =>
    items.map((recording) => toRecordingRow(recording, offline, now));
  const loopGroups = [...loops.entries()].map(([loopId, group]) => ({
    loopId,
    name: group.name,
    rows: toRows(group.items),
  }));
  const copy = VIEW_COPY[view.kind];

  return {
    title: RECORDINGS_MENU_LABEL,
    subtitle: `${input.viewName} · ${copy.subtitle}`,
    mainTitle: copy.main,
    main: toRows(main),
    loopsTitle: LOOPS_SECTION_TITLE,
    loops: loopGroups,
    count:
      main.length +
      loopGroups.reduce((sum, group) => sum + group.rows.length, 0),
    emptyMessage: EMPTY_LIST_MESSAGE,
  };
};

/** The muted count beside the menu row, or nothing while there are none. */
export const formatRecordingsMenuCount = (
  count: number,
): string | undefined => {
  return count > 0 ? String(count) : undefined;
};
