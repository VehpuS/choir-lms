import type { Recording } from '@org/audio-library-models';

import {
  getRecordingsPanelModel,
  type RecordingsView,
} from './recordings-panel-model';

/** What a Library menu names to ask how many recordings an item has. */
export type RecordingsMenuTarget = {
  id: string;
  /** A track's source id, or a loop's id. */
  kind: 'loop' | 'track';
  /** The source is a saved adjusted copy of a track. */
  isAdjusted?: boolean;
};

const NO_OFFLINE = { sources: [], stateOf: () => 'kept' as const };

const viewOf = (target: RecordingsMenuTarget): RecordingsView =>
  target.kind === 'loop'
    ? { kind: 'loop', loopId: target.id }
    : {
        kind: target.isAdjusted ? 'adjusted' : 'track',
        sourceId: target.id,
      };

/**
 * How many recordings the panel for this item would list, counted the way the
 * panel counts (main section plus a track's loops), against the saved ids.
 */
export const countRecordingsFor = (
  target: RecordingsMenuTarget,
  recordings: readonly Recording[],
  saved: {
    savedLoopIds: ReadonlySet<string>;
    savedSourceIds: ReadonlySet<string>;
  },
): number =>
  getRecordingsPanelModel({
    view: viewOf(target),
    viewName: '',
    recordings,
    library: {
      sources: [...saved.savedSourceIds].map((id) => ({ id })),
      loops: [...saved.savedLoopIds].map((id) => ({ id })),
    },
    offline: NO_OFFLINE,
    now: new Date(),
  }).count;
