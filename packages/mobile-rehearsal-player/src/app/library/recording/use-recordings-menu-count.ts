import type { PlayableItem } from '@org/audio-library-models';
import { useMemo } from 'react';

import { useSavedLibraryIds } from '../components/saved-item-menu/saved-item-availability-context';
import {
  formatRecordingsMenuCount,
  getRecordingsPanelModel,
  getRecordingsView,
} from './recordings-panel-model';
import { useRecordingsList } from './use-recordings-list';

const NO_OFFLINE = { sources: [], stateOf: () => 'kept' as const };

/** The muted count beside `Recordings` in the playback menu, for the playing item. */
export const useRecordingsMenuCount = (
  item: Pick<PlayableItem, 'kind' | 'loopId' | 'source'>,
): string | undefined => {
  const { recordings } = useRecordingsList();
  const { savedLoopIds, savedSourceIds } = useSavedLibraryIds();

  return useMemo(() => {
    if (!recordings || recordings.length === 0) {
      return undefined;
    }

    const model = getRecordingsPanelModel({
      view: getRecordingsView(item),
      viewName: '',
      recordings,
      library: {
        sources: [...savedSourceIds].map((id) => ({ id })),
        loops: [...savedLoopIds].map((id) => ({ id })),
      },
      offline: NO_OFFLINE,
      now: new Date(),
    });

    return formatRecordingsMenuCount(model.count);
  }, [item, recordings, savedLoopIds, savedSourceIds]);
};
