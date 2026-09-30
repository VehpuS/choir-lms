/**
 * Counts overlapping loads so `isPreparing` stays true until the last one
 * settles. Loads can overlap once a newer play request supersedes one still
 * downloading: the older load's `finally` must not clear the newer one's
 * loading state.
 */
export const createPreparingTracker = (
  onChange: (isPreparing: boolean) => void,
) => {
  let pendingCount = 0;

  return {
    /** `true` when a load starts, `false` when it settles (success or not). */
    setIsPreparing(isPreparing: boolean) {
      pendingCount = isPreparing
        ? pendingCount + 1
        : Math.max(0, pendingCount - 1);
      onChange(pendingCount > 0);
    },
    /** The player stopped or failed outright: nothing is loading any more. */
    reset() {
      pendingCount = 0;
      onChange(false);
    },
  };
};
