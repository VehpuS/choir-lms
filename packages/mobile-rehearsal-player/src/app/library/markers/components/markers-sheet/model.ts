import {
  buildMarkerList,
  validateLoopRange,
  type DerivedLoopMarker,
  type MarkerListEntry,
  type MarkerListFilter,
  type MarkerRange,
  type TrackMarker,
} from '@org/audio-library-models';

import { formatLoopEditorPrecise } from '../../../loops/components/loop-editor/format';

export const MARKERS_SHEET_TITLE = 'Markers';
export const MARKERS_EMPTY_MESSAGE = 'No markers yet';
export const MARKERS_PAST_END_MESSAGE = 'Past the end of this audio';
export const MARKERS_SELECT_PAIR_SIZE = 2;

export const MARKERS_FILTER_OPTIONS: ReadonlyArray<{
  filter: MarkerListFilter;
  label: string;
}> = [
  { filter: 'all', label: 'All' },
  { filter: 'mine', label: 'My markers' },
];

export type MarkerRowAction =
  | 'delete'
  | 'keep-as-marker'
  | 'loop-to-next'
  | 'move'
  | 'open-loop'
  | 'rename';

/** Explicit rows are editable; derived rows only lead to their loop. */
const EXPLICIT_ROW_ACTIONS: readonly MarkerRowAction[] = [
  'loop-to-next',
  'rename',
  'move',
  'delete',
];
const DERIVED_ROW_ACTIONS: readonly MarkerRowAction[] = [
  'open-loop',
  'keep-as-marker',
  'loop-to-next',
];

export const MARKER_ROW_ACTION_LABELS: Record<MarkerRowAction, string> = {
  delete: 'Delete',
  'keep-as-marker': 'Keep as marker',
  'loop-to-next': 'Loop to next marker',
  move: 'Move',
  'open-loop': 'Open loop',
  rename: 'Rename',
};

/** Boundaries and name a row hands to the loop editor in create mode. */
export type MarkerLoopDraft = {
  name: string;
  startMs: number;
  endMs: number;
};

export type MarkerRow = {
  key: string;
  name: string;
  timeLabel: string;
  positionMs: number;
  origin: MarkerListEntry['origin'];
  isPastEnd: boolean;
  /** Shown under the name when the marker cannot be jumped to. */
  pastEndMessage?: string;
  canJump: boolean;
  actions: readonly MarkerRowAction[];
  /** Present when `Loop to next marker` is offered for this row. */
  loopToNext?: MarkerLoopDraft;
  /** Explicit marker id or derived loop id, for the action handlers. */
  markerId?: string;
  loopId?: string;
};

export type MarkersSheetInput = {
  explicit: readonly TrackMarker[];
  derived: readonly DerivedLoopMarker[];
  filter: MarkerListFilter;
  ownerName: string;
  /** Loop context: only markers inside this range are listed. */
  range?: MarkerRange;
  durationMs?: number;
  /** The owner (or one of its loops or copies) is the loaded item. */
  isOwnerLoaded: boolean;
  canMutateLibrary: boolean;
};

export type MarkersSheetModel = {
  subtitle: string;
  rows: MarkerRow[];
  isEmpty: boolean;
  emptyMessage: string;
  /** `Add marker here` needs a playhead to take the position from. */
  canAddMarker: boolean;
  /** `Create loops from markers` needs at least one explicit marker. */
  canCreateLoops: boolean;
  /** `Select` needs two rows that could bound a loop. */
  canSelect: boolean;
};

export const formatMarkerTime = (positionMs: number): string => {
  return formatLoopEditorPrecise(positionMs);
};

const toDraft = (
  start: MarkerListEntry,
  endMs: number,
  durationMs?: number,
): MarkerLoopDraft | undefined => {
  const range = validateLoopRange(start.positionMs, endMs, durationMs);

  if (!range.isValid) {
    return undefined;
  }

  return {
    name: start.name,
    startMs: range.normalizedStartMs,
    endMs: range.normalizedEndMs,
  };
};

/**
 * End of the loop that starts at `entries[index]`: the next listed marker, or
 * the track end for the last one when it is known. The next marker may share
 * the position, in which case there is no loop to offer.
 */
const resolveLoopToNext = (
  entries: readonly MarkerListEntry[],
  index: number,
  durationMs?: number,
): MarkerLoopDraft | undefined => {
  const start = entries[index];
  const next = entries[index + 1];

  if (!start || start.isPastEnd) {
    return undefined;
  }

  const endMs = next ? next.positionMs : durationMs;

  return endMs === undefined ? undefined : toDraft(start, endMs, durationMs);
};

const toRow = (
  entry: MarkerListEntry,
  loopToNext: MarkerLoopDraft | undefined,
  canMutateLibrary: boolean,
): MarkerRow => {
  const isExplicit = entry.origin === 'explicit';
  const candidates = isExplicit ? EXPLICIT_ROW_ACTIONS : DERIVED_ROW_ACTIONS;
  const actions = candidates.filter((action) => {
    if (action === 'loop-to-next') {
      return loopToNext !== undefined;
    }

    // Writing a marker (or a loop) needs a writable library.
    return action === 'open-loop' || canMutateLibrary;
  });

  return {
    key: entry.key,
    name: entry.name,
    timeLabel: formatMarkerTime(entry.positionMs),
    positionMs: entry.positionMs,
    origin: entry.origin,
    isPastEnd: entry.isPastEnd,
    ...(entry.isPastEnd ? { pastEndMessage: MARKERS_PAST_END_MESSAGE } : {}),
    canJump: !entry.isPastEnd,
    actions,
    ...(loopToNext ? { loopToNext } : {}),
    ...(entry.origin === 'explicit'
      ? { markerId: entry.id }
      : { loopId: entry.loopId }),
  };
};

export const buildMarkersSheetModel = (
  input: MarkersSheetInput,
): MarkersSheetModel => {
  const entries = buildMarkerList({
    explicit: input.explicit,
    derived: input.derived,
    filter: input.filter,
    range: input.range,
    durationMs: input.durationMs,
  });
  const rows = entries.map((entry, index) =>
    toRow(
      entry,
      resolveLoopToNext(entries, index, input.durationMs),
      input.canMutateLibrary,
    ),
  );
  const usableCount = rows.filter((row) => row.canJump).length;

  return {
    subtitle: `Markers for ${input.ownerName}`,
    rows,
    isEmpty: rows.length === 0,
    emptyMessage: MARKERS_EMPTY_MESSAGE,
    canAddMarker: input.isOwnerLoaded && input.canMutateLibrary,
    canCreateLoops: input.canMutateLibrary && input.explicit.length > 0,
    canSelect: usableCount >= MARKERS_SELECT_PAIR_SIZE,
  };
};

/** Select mode: choosing exactly two rows to bound a new loop. */
export type MarkerSelection = {
  isSelecting: boolean;
  selectedKeys: readonly string[];
};

export const INITIAL_MARKER_SELECTION: MarkerSelection = {
  isSelecting: false,
  selectedKeys: [],
};

export const startMarkerSelection = (): MarkerSelection => ({
  isSelecting: true,
  selectedKeys: [],
});

export const cancelMarkerSelection = (): MarkerSelection =>
  INITIAL_MARKER_SELECTION;

/** Toggles a row; a third pick is ignored so the pair stays unambiguous. */
export const toggleMarkerSelection = (
  selection: MarkerSelection,
  key: string,
): MarkerSelection => {
  if (!selection.isSelecting) {
    return selection;
  }

  if (selection.selectedKeys.includes(key)) {
    return {
      ...selection,
      selectedKeys: selection.selectedKeys.filter((entry) => entry !== key),
    };
  }

  if (selection.selectedKeys.length >= MARKERS_SELECT_PAIR_SIZE) {
    return selection;
  }

  return { ...selection, selectedKeys: [...selection.selectedKeys, key] };
};

/**
 * The `Make loop` draft: earlier selected marker as start, later as end,
 * named after the start. Undefined unless exactly two are chosen and they
 * form a valid range.
 */
export const resolveMarkerPairLoop = (
  rows: readonly MarkerRow[],
  selection: MarkerSelection,
  durationMs?: number,
): MarkerLoopDraft | undefined => {
  if (selection.selectedKeys.length !== MARKERS_SELECT_PAIR_SIZE) {
    return undefined;
  }

  // Rows are already ordered, so the first selected row in list order starts.
  const chosen = rows.filter((row) => selection.selectedKeys.includes(row.key));
  const [start, end] = chosen;

  if (!start || !end || start.isPastEnd || end.isPastEnd) {
    return undefined;
  }

  const range = validateLoopRange(start.positionMs, end.positionMs, durationMs);

  if (!range.isValid) {
    return undefined;
  }

  return {
    name: start.name,
    startMs: range.normalizedStartMs,
    endMs: range.normalizedEndMs,
  };
};
