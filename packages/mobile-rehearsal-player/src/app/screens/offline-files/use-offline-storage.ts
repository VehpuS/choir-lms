import { useCallback, useEffect, useMemo, useState } from 'react';

import { audioCacheBudgetStore } from '../../library/playback/audio-cache/audio-cache-budget';
import { persistentAudioCache } from '../../library/playback/audio-cache';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../library/storage/local-library-storage';
import { practiceRepository } from '../../library/saved-rehearsal-library/use-saved-rehearsal-library';
import {
  buildOfflineStorageSnapshot,
  type OfflineFileSort,
} from '../../library/offline/offline-storage-model';
import { offlineStorageService } from '../../library/offline/offline-storage-instance';
import type { AudioStoreEntry } from '../../library/playback/audio-cache/audio-store-types';

const service = offlineStorageService;

/** The library's file names, for entries stored without one. */
const loadLibraryNames = async (): Promise<Map<string, string>> => {
  try {
    const sources = await practiceRepository.listSources(
      LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
    );

    return new Map(sources.map((source) => [source.driveFileId, source.name]));
  } catch {
    return new Map();
  }
};

/**
 * What the offline files view shows: the stored files with their names, kept
 * apart from automatic, re-read whenever the cache or its size changes (and so
 * re-verified from the store rather than trusted from an index).
 */
export const useOfflineStorage = (sort: OfflineFileSort) => {
  const [entries, setEntries] = useState<AudioStoreEntry[] | null>(null);
  const [libraryNames, setLibraryNames] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [budgetBytes, setBudgetBytes] = useState(audioCacheBudgetStore.get());
  const refresh = useCallback(async () => {
    setEntries(await service.list());
  }, []);

  useEffect(() => {
    let isCurrent = true;

    void loadLibraryNames().then((names) => {
      if (isCurrent) {
        setLibraryNames(names);
      }
    });
    void refresh();

    const unsubscribeCache = persistentAudioCache.subscribe(() => {
      void refresh();
    });
    const unsubscribeBudget = audioCacheBudgetStore.subscribe(() => {
      setBudgetBytes(audioCacheBudgetStore.get());
    });

    return () => {
      isCurrent = false;
      unsubscribeCache();
      unsubscribeBudget();
    };
  }, [refresh]);

  const snapshot = useMemo(() => {
    return buildOfflineStorageSnapshot({
      budgetBytes,
      entries: entries ?? [],
      libraryNames,
      sort,
    });
  }, [budgetBytes, entries, libraryNames, sort]);

  return { isLoading: entries === null, service, snapshot };
};
