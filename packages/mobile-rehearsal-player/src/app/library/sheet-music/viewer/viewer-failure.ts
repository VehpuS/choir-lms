import type { SheetMusicSource } from '@org/audio-library-models';

import { describeViewerFailure, type ViewerFailure } from './model';
import type { SheetMusicDocumentState } from './use-sheet-music-document';
import type { ViewerOutcome } from './viewer-body';

/**
 * Why the viewer cannot show the source, from a failed load or a failed draw,
 * with its actions. Without a save flow (native) the card does not offer one.
 */
export const resolveViewerFailure = (options: {
  canSaveToDrive: boolean;
  outcome: ViewerOutcome | undefined;
  source: SheetMusicSource | undefined;
  state: SheetMusicDocumentState;
}): ViewerFailure | undefined => {
  const { outcome, source, state } = options;
  const reason =
    state.status === 'failed'
      ? state.reason
      : outcome?.kind === 'failed'
        ? outcome.reason
        : undefined;
  const described =
    source && reason ? describeViewerFailure(reason, source) : undefined;

  return (
    described && {
      ...described,
      actions: described.actions.filter(
        (action) => action !== 'save-to-drive' || options.canSaveToDrive,
      ),
    }
  );
};
