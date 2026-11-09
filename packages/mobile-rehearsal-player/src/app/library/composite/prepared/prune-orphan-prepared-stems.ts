import type { PreparedStemStore } from './prepared-stem-types';

/**
 * Deletes the prepared stems of composites that are not in `knownCompositeIds`.
 * A composite removed before the page loaded (or by another tab) never fires
 * the store's `onDeleted`, so its stems would stay behind. Call it only with
 * ids from a successful read of the composites: a failed read would look like
 * "no composites" and delete every prepared stem.
 */
export const pruneOrphanPreparedStems = async (
  preparedStems: Pick<PreparedStemStore, 'listComposites' | 'deleteComposite'>,
  knownCompositeIds: readonly string[],
): Promise<string[]> => {
  const known = new Set(knownCompositeIds);
  const orphanIds = (await preparedStems.listComposites())
    .map(({ compositeId }) => compositeId)
    .filter((compositeId) => !known.has(compositeId));

  for (const compositeId of orphanIds) {
    await preparedStems.deleteComposite(compositeId);
  }

  return orphanIds;
};
