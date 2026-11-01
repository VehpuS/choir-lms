import type { Recording } from '@org/audio-library-models';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  buildRecordingsStorageSummary,
  type RecordingStorageSort,
} from './recordings-storage-model';
import { getRecordingsStore } from './recordings-store-instance';

/**
 * Recordings and their total for Settings and the offline files view, read
 * from the store on open and again after a delete. `isLoading` is true until
 * the first read, so a view does not flash an empty state.
 */
export const useRecordingsStorage = (sort: RecordingStorageSort = 'recent') => {
  const [recordings, setRecordings] = useState<Recording[] | null>(null);
  const store = getRecordingsStore();
  const refresh = useCallback(async () => {
    try {
      setRecordings(await store.list());
    } catch {
      setRecordings([]);
    }
  }, [store]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(
    () => buildRecordingsStorageSummary(recordings ?? [], sort),
    [recordings, sort],
  );
  const deleteRecording = useCallback(
    async (id: string) => {
      await store.delete(id);
      await refresh();
    },
    [refresh, store],
  );

  return { deleteRecording, isLoading: recordings === null, summary };
};
