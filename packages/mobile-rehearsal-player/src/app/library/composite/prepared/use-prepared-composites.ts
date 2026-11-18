import { useCallback, useEffect, useMemo, useState } from 'react';

import { useComposites } from '../store/composite-store-instance';
import {
  buildPreparedCompositesSummary,
  type PreparedCompositesSummary,
} from './prepared-composites-model';
import { isListeningOwnerId } from './prepared-owner';
import { getPreparedStemStore } from './prepared-stem-instance';
import type { PreparedCompositeUsage } from './prepared-stem-types';

/**
 * The prepared composite stems for the offline files view, read from the store
 * on open and again after a clear, like recordings. `clearAll` removes only
 * this cache: no composite, track or recording is touched.
 */
export const usePreparedComposites = (): {
  clearAll: () => Promise<void>;
  isLoading: boolean;
  summary: PreparedCompositesSummary;
} => {
  const [usage, setUsage] = useState<PreparedCompositeUsage[] | null>(null);
  const composites = useComposites();
  const refresh = useCallback(async () => {
    try {
      const owners = await getPreparedStemStore().listComposites();

      // Single tracks prepared for listening have their own group.
      setUsage(
        owners.filter((owner) => !isListeningOwnerId(owner.compositeId)),
      );
    } catch {
      setUsage([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(
    () => buildPreparedCompositesSummary(usage ?? [], composites),
    [composites, usage],
  );
  const clearAll = useCallback(async () => {
    await getPreparedStemStore().deleteAll();
    await refresh();
  }, [refresh]);

  return { clearAll, isLoading: usage === null, summary };
};
