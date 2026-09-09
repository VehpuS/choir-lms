import type { DriveImportPlan } from './drive-import-planner';
import type { DriveImportSelectionOverlapCounts } from './drive-import-selection-normalizer';

export type DriveImportExecutionPhase =
  | 'creating-folders'
  | 'linking-tracks'
  | 'saving-sources';

export type DriveImportProgress =
  | {
      completedItems: number;
      phase: 'preparing';
      totalItems?: number;
    }
  | {
      completedItems: number;
      phase: DriveImportExecutionPhase;
      totalItems: number;
    };

export type DriveImportOutcomeStatus =
  | 'already-present'
  | 'cancelled'
  | 'created'
  | 'failed'
  | 'overlap-collapsed'
  | 'reused'
  | 'unsupported';

export type DriveImportOutcomeItemKind =
  | 'folder'
  | 'link'
  | 'selection'
  | 'source';

type DriveImportOutcomeBase = {
  itemId: string;
  itemKind: DriveImportOutcomeItemKind;
  itemName: string;
};

export type DriveImportOutcome = DriveImportOutcomeBase &
  (
    | {
        status: Exclude<DriveImportOutcomeStatus, 'failed'>;
      }
    | {
        errorMessage: string;
        status: 'failed';
      }
  );

export type DriveImportReviewSummary = DriveImportPlan['summary'] & {
  collapsedOverlaps: number;
};

export type DriveImportCompletionStatus =
  | 'cancelled'
  | 'completed'
  | 'failed'
  | 'partial-failure';

export type DriveImportCompletionSummary = {
  counts: Record<DriveImportOutcomeStatus, number>;
  status: DriveImportCompletionStatus;
  totalItems: number;
};

const createEmptyOutcomeCounts = (): Record<
  DriveImportOutcomeStatus,
  number
> => ({
  'already-present': 0,
  cancelled: 0,
  created: 0,
  failed: 0,
  'overlap-collapsed': 0,
  reused: 0,
  unsupported: 0,
});

export const createDriveImportReviewSummary = (
  plan: DriveImportPlan,
  overlapCounts: DriveImportSelectionOverlapCounts,
): DriveImportReviewSummary => ({
  ...plan.summary,
  collapsedOverlaps: overlapCounts.total,
});

const resolveCompletionStatus = (
  counts: Readonly<Record<DriveImportOutcomeStatus, number>>,
): DriveImportCompletionStatus => {
  if (counts.cancelled > 0) {
    return 'cancelled';
  }

  if (counts.failed === 0) {
    return 'completed';
  }

  return counts.failed === countsTotal(counts) ? 'failed' : 'partial-failure';
};

const countsTotal = (
  counts: Readonly<Record<DriveImportOutcomeStatus, number>>,
) => Object.values(counts).reduce((total, count) => total + count, 0);

export const createDriveImportCompletionSummary = (
  outcomes: readonly DriveImportOutcome[],
): DriveImportCompletionSummary => {
  const counts = createEmptyOutcomeCounts();

  for (const outcome of outcomes) {
    counts[outcome.status] += 1;
  }

  return {
    counts,
    status: resolveCompletionStatus(counts),
    totalItems: outcomes.length,
  };
};
