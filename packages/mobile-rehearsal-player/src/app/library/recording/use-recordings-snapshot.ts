import type { Recording } from '@org/audio-library-models';
import { useEffect, useState } from 'react';

import {
  getRecordingsSnapshot,
  refreshRecordingsSnapshot,
  subscribeToRecordingsChange,
} from './recordings-store-instance';

/**
 * Every finished recording, kept current for surfaces that only need to know
 * what exists (the counts in Library menus). It follows the store's own
 * snapshot, so a recording saved, deleted or imported updates it at once.
 */
export const useRecordingsSnapshot = (): readonly Recording[] => {
  const [recordings, setRecordings] = useState(getRecordingsSnapshot);

  useEffect(() => {
    let isCancelled = false;

    void refreshRecordingsSnapshot().then((next) => {
      if (!isCancelled) {
        setRecordings(next);
      }
    });

    const unsubscribe = subscribeToRecordingsChange(() => {
      setRecordings(getRecordingsSnapshot());
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  return recordings;
};
