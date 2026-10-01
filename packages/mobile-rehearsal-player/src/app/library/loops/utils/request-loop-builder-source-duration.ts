export type LoopBuilderDurationSource = {
  durationMs?: number;
  id: string;
};

type RequestLoopBuilderSourceDurationDependencies = {
  /** A cached lookup result: a length, null for a failed lookup, or undefined. */
  cachedDurationMs: number | null | undefined;
  canRequest: boolean;
  /** Asks Drive for the file's metadata length. */
  fetchDriveDurationMs: () => Promise<number | null>;
  onPendingChange: (sourceId: string | null) => void;
  onResolved: (durationMs: number | null) => void;
  persistDurationMs: (durationMs: number) => void;
  /** Loads the file into the player to read its length. */
  probeDurationMs: () => Promise<number | null>;
};

/**
 * Resolves a track's length for the loop editor: stored length, then Drive
 * metadata, then (when the user is waiting on it) a player probe. The pending
 * flag covers the whole chain, probe included, because the editor shows its
 * loading state and hides the missing-length warning for exactly that long.
 */
export const requestLoopBuilderSourceDuration = async (
  source: LoopBuilderDurationSource,
  requestOptions:
    | { retryFailedLookup?: boolean; showPending?: boolean }
    | undefined,
  dependencies: RequestLoopBuilderSourceDurationDependencies,
) => {
  const { cachedDurationMs } = dependencies;

  if (source.durationMs !== undefined) {
    return source.durationMs;
  }

  if (
    cachedDurationMs !== undefined &&
    (cachedDurationMs !== null || !requestOptions?.retryFailedLookup)
  ) {
    return cachedDurationMs;
  }

  if (!dependencies.canRequest) {
    return cachedDurationMs;
  }

  if (requestOptions?.showPending) {
    dependencies.onPendingChange(source.id);
  }

  try {
    const driveDurationMs = await dependencies.fetchDriveDurationMs();

    dependencies.onResolved(driveDurationMs);

    if (typeof driveDurationMs === 'number') {
      dependencies.persistDurationMs(driveDurationMs);
      return driveDurationMs;
    }

    // Awaited, not returned bare: `finally` below must not clear the pending
    // flag while the probe is still running.
    return requestOptions?.showPending
      ? await dependencies.probeDurationMs()
      : null;
  } catch {
    dependencies.onResolved(null);

    return requestOptions?.showPending
      ? await dependencies.probeDurationMs()
      : null;
  } finally {
    if (requestOptions?.showPending) {
      dependencies.onPendingChange(null);
    }
  }
};
