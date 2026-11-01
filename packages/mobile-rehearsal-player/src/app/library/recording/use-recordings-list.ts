import type { Recording } from '@org/audio-library-models';
import { useCallback, useEffect, useState } from 'react';

import { getRecordingsStore } from './recordings-store-instance';

/**
 * Every recording on the device, read from the store when a view opens and
 * again after a change. `null` until the first read, so a list does not flash
 * an empty state; a failed read leaves it empty.
 */
export const useRecordingsList = () => {
  const [recordings, setRecordings] = useState<Recording[] | null>(null);
  const refresh = useCallback(async () => {
    try {
      setRecordings(await getRecordingsStore().list());
    } catch {
      setRecordings([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { recordings, refresh };
};
