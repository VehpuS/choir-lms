import type { DriveImportExecutionResult } from './drive-import-executor';

export const createDriveImportExecutionResult = (
  outcomes: DriveImportExecutionResult['outcomes'],
): DriveImportExecutionResult => {
  const counts: DriveImportExecutionResult['summary']['counts'] = {
    'already-present': 0,
    cancelled: 0,
    created: 0,
    failed: 0,
    'overlap-collapsed': 0,
    reused: 0,
    unsupported: 0,
  };

  for (const outcome of outcomes) {
    counts[outcome.status] += 1;
  }

  return {
    outcomes,
    summary: {
      counts,
      status:
        counts.cancelled > 0
          ? 'cancelled'
          : counts.failed > 0
            ? 'partial-failure'
            : 'completed',
      totalItems: outcomes.length,
    },
  };
};

export const createDeferred = <Value>() => {
  let resolve!: (value: Value) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
};
