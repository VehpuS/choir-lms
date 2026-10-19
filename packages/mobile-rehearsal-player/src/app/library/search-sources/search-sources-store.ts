import type { SearchSource, SearchSourceKind } from '@org/audio-library-models';
import { useSyncExternalStore } from 'react';

import {
  createDefaultSearchSources,
  persistSearchSources,
  restoreSearchSources,
  type SearchSourcesState,
} from './search-sources-storage';

// One device-wide copy shared by the add flow, the lyrics editor, and
// Settings, so a change in one shows in the others at once (same pattern as the
// part list).
let current: SearchSourcesState = createDefaultSearchSources();
let hasRestored = false;
const changedBeforeRestore = new Set<SearchSourceKind>();
const listeners = new Set<() => void>();

const publish = (next: SearchSourcesState) => {
  current = next;
  listeners.forEach((listener) => {
    listener();
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  if (!hasRestored) {
    hasRestored = true;
    void restoreSearchSources().then((restored) => {
      // A list changed while the read was pending must not be overwritten.
      publish({
        lyrics: changedBeforeRestore.has('lyrics')
          ? current.lyrics
          : restored.lyrics,
        'sheet-music': changedBeforeRestore.has('sheet-music')
          ? current['sheet-music']
          : restored['sheet-music'],
      });
    });
  }

  return () => {
    listeners.delete(listener);
  };
};

export const updateSearchSources = (
  kind: SearchSourceKind,
  sources: readonly SearchSource[],
) => {
  changedBeforeRestore.add(kind);
  publish({ ...current, [kind]: [...sources] });
  void persistSearchSources(kind, sources);
};

export const resetSearchSources = (kind: SearchSourceKind) => {
  updateSearchSources(kind, createDefaultSearchSources()[kind]);
};

/** The kind's ordered sources; the first is the default. */
export const useSearchSources = (kind: SearchSourceKind): SearchSource[] => {
  return useSyncExternalStore(subscribe, () => current[kind]);
};
