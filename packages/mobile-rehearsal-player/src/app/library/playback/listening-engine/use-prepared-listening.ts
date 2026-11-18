import { useCallback, useEffect, useMemo, useState } from 'react';

import { getLibraryTrack } from '../../composite/library-tracks';
import { getPreparedStemStore } from '../../composite/prepared/prepared-stem-instance';
import type { PreparedCompositeUsage } from '../../composite/prepared/prepared-stem-types';
import {
  buildPreparedListeningSummary,
  type PreparedListeningSummary,
} from './prepared-listening-model';

/**
 * The audio prepared for single tracks, for the offline files view: read from
 * the store on open and again on `refresh` (after `Clear all`).
 */
export const usePreparedListening = (): {
  refresh: () => Promise<void>;
  summary: PreparedListeningSummary;
} => {
  const [usage, setUsage] = useState<PreparedCompositeUsage[]>([]);
  const refresh = useCallback(async () => {
    try {
      setUsage(await getPreparedStemStore().listComposites());
    } catch {
      setUsage([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(
    () =>
      buildPreparedListeningSummary(
        usage,
        (trackId) => getLibraryTrack(trackId)?.name,
      ),
    [usage],
  );

  return { refresh, summary };
};
