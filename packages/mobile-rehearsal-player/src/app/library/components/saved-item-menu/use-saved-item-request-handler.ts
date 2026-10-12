import type { NamedLoop } from '@org/audio-library-models';
import { useEffect } from 'react';

import { requestLoopBuilder } from '../../loops/utils/loop-builder-request';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import {
  subscribeToSavedItemRequests,
  type SavedItemRequest,
} from './saved-item-requests';

type SavedItemRequestHandlers = {
  openLoopEditor: (loop: NamedLoop) => void;
  openLoopPlaylistSelector: (loopId: string) => void;
  openLoopTagEditor: (loop: NamedLoop) => void;
  openSourcePlaylistSelector: (sourceId: string) => void;
  openSourceTagEditor: (source: DriveLibrarySource) => void;
  openTrackLoopView: (sourceId: string) => void;
  removeLoop: (loop: NamedLoop) => void;
  removeSource: (source: DriveLibrarySource) => void;
  savedLibrarySources: readonly DriveLibrarySource[];
  savedLoops: readonly NamedLoop[];
  setSelectedView: (view: SavedRehearsalLibraryView) => void;
};

// Runs the item actions that Recents, Up next and the playback sheet ask for
// (task 8.26) with the Library's own flows, so each opens the same sheet or
// confirmation it does from a Library row.
export const useSavedItemRequestHandler = (
  handlers: SavedItemRequestHandlers,
) => {
  useEffect(() => {
    return subscribeToSavedItemRequests((request: SavedItemRequest) => {
      if (request.kind === 'loop') {
        const loop = handlers.savedLoops.find(({ id }) => id === request.id);

        if (!loop) {
          return;
        }

        if (request.action === 'add-to-playlist') {
          handlers.openLoopPlaylistSelector(loop.id);
        } else if (request.action === 'edit-loop') {
          handlers.openLoopEditor(loop);
        } else if (request.action === 'edit-tags') {
          handlers.openLoopTagEditor(loop);
        } else if (request.action === 'remove-from-library') {
          handlers.removeLoop(loop);
        }

        return;
      }

      const source = handlers.savedLibrarySources.find(
        ({ id }) => id === request.id,
      );

      if (!source) {
        return;
      }

      if (request.action === 'add-to-playlist') {
        handlers.openSourcePlaylistSelector(source.id);
      } else if (request.action === 'edit-tags') {
        handlers.openSourceTagEditor(source);
      } else if (request.action === 'make-loop') {
        requestLoopBuilder({ sourceId: source.id, startMs: 0 });
      } else if (request.action === 'view-track-loops') {
        handlers.setSelectedView('loops');
        handlers.openTrackLoopView(source.id);
      } else if (request.action === 'remove-from-library') {
        handlers.removeSource(source);
      }
    });
  });
};
