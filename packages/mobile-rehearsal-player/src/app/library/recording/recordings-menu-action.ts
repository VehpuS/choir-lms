import type { OptionsMenuAction } from '../components/options-menu-sheet/model';
import { requestSavedItemAction } from '../components/saved-item-menu/saved-item-requests';
import { recordingsStorageSupported } from './recording-capabilities';
import type { RecordingsMenuTarget } from './recordings-menu-count';
import {
  formatRecordingsMenuCount,
  RECORDINGS_MENU_LABEL,
} from './recordings-panel-model';

/** What a Library menu needs to offer recordings for one item. */
export type RecordingsMenuState = {
  /** How many recordings the item has; the row is left out when there are none. */
  count: number;
  /** Opens the Recordings panel for the item. */
  onOpenRecordings: () => void;
};

/** The `Recordings` action of a saved-item menu, with a count; absent when there are none. */
export const resolveRecordingsMenuActions = (
  recordings: RecordingsMenuState | undefined,
  idPrefix: string,
): OptionsMenuAction[] => {
  if (!recordings || recordings.count === 0) {
    return [];
  }

  return [
    {
      id: `${idPrefix}:recordings`,
      label: RECORDINGS_MENU_LABEL,
      meta: formatRecordingsMenuCount(recordings.count),
      onPress: recordings.onOpenRecordings,
      tone: 'secondary',
    },
  ];
};

/**
 * Menu state for a track or adjusted track (by source id) or a loop (by loop
 * id), or nothing where recordings cannot be stored or listed. `count` is how
 * many recordings the item has (see `useRecordingsCountFor`).
 */
export const createRecordingsMenuState = (
  options: { count: number; id: string; kind: 'loop' | 'track' },
  isSupported: () => boolean = recordingsStorageSupported,
): RecordingsMenuState | undefined => {
  if (!isSupported()) {
    return undefined;
  }

  return {
    count: options.count,
    onOpenRecordings: () => {
      requestSavedItemAction({
        action: 'recordings',
        id: options.id,
        kind: options.kind,
      });
    },
  };
};

type CountRecordings = (target: RecordingsMenuTarget) => number;

/** Menu state for a saved track or adjusted track, counted by `countFor`. */
export const createSourceRecordingsMenuState = (
  source: { adjustment?: unknown; id: string },
  countFor: CountRecordings,
): RecordingsMenuState | undefined =>
  createRecordingsMenuState({
    count: countFor({
      id: source.id,
      isAdjusted: Boolean(source.adjustment),
      kind: 'track',
    }),
    id: source.id,
    kind: 'track',
  });

/** Menu state for a saved loop, counted by `countFor`. */
export const createLoopRecordingsMenuState = (
  loopId: string,
  countFor: CountRecordings,
): RecordingsMenuState | undefined =>
  createRecordingsMenuState({
    count: countFor({ id: loopId, kind: 'loop' }),
    id: loopId,
    kind: 'loop',
  });
