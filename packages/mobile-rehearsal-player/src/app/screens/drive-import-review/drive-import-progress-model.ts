import type {
  DriveImportCompletionStatus,
  DriveImportCompletionSummary,
  DriveImportExecutionPhase,
  DriveImportOutcome,
  DriveImportProgress,
} from '../../library/saved-rehearsal-library/drive-import-status';
import type { DriveImportControllerState } from '../../library/saved-rehearsal-library/use-drive-import-controller';

export type DriveImportReviewHeaderMode = 'completed' | 'default' | 'executing';

export const resolveDriveImportReviewHeaderMode = (
  status: DriveImportControllerState['status'],
): DriveImportReviewHeaderMode => {
  switch (status) {
    case 'executing':
      return 'executing';
    case 'completed':
      return 'completed';
    default:
      return 'default';
  }
};

const EXECUTION_PHASE_LABELS: Record<DriveImportExecutionPhase, string> = {
  'creating-folders': 'Creating folders',
  'linking-tracks': 'Linking tracks',
  'saving-sources': 'Saving tracks',
};

export type DriveImportProgressCopy = {
  completedItems: number;
  phaseLabel: string;
  totalItems: number | null;
};

export const getDriveImportProgressCopy = (
  progress: DriveImportProgress,
): DriveImportProgressCopy => ({
  completedItems: progress.completedItems,
  phaseLabel:
    progress.phase === 'preparing'
      ? 'Preparing Drive contents'
      : EXECUTION_PHASE_LABELS[progress.phase],
  totalItems: progress.totalItems ?? null,
});

export type DriveImportCompletionStatusCopy = {
  description: string;
  title: string;
};

const COMPLETION_STATUS_COPY: Record<
  DriveImportCompletionStatus,
  DriveImportCompletionStatusCopy
> = {
  cancelled: {
    description:
      'The import stopped early. Work that already finished was kept.',
    title: 'Import cancelled',
  },
  completed: {
    description: 'Every selected item was imported successfully.',
    title: 'Import complete',
  },
  failed: {
    description: 'The import could not complete.',
    title: 'Import failed',
  },
  'partial-failure': {
    description:
      'Some items could not be imported. Work that already finished was kept.',
    title: 'Import completed with some failures',
  },
};

export const getDriveImportCompletionStatusCopy = (
  status: DriveImportCompletionStatus,
): DriveImportCompletionStatusCopy => COMPLETION_STATUS_COPY[status];

export const canRetryDriveImportCompletion = (
  summary: DriveImportCompletionSummary,
) => summary.status !== 'completed';

export type DriveImportCompletionCountRow = {
  key: keyof DriveImportCompletionSummary['counts'];
  label: string;
  value: number;
};

const COMPLETION_COUNT_ROW_ORDER: ReadonlyArray<{
  key: keyof DriveImportCompletionSummary['counts'];
  label: string;
}> = [
  { key: 'created', label: 'Created' },
  { key: 'reused', label: 'Reused' },
  { key: 'already-present', label: 'Already in destination' },
  { key: 'unsupported', label: 'Unsupported files skipped' },
  { key: 'overlap-collapsed', label: 'Overlapping selections collapsed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'failed', label: 'Failed' },
];

export const buildDriveImportCompletionSummaryRows = (
  summary: DriveImportCompletionSummary,
): DriveImportCompletionCountRow[] =>
  COMPLETION_COUNT_ROW_ORDER.map(({ key, label }) => ({
    key,
    label,
    value: summary.counts[key],
  }));

export type DriveImportFailedOutcome = Extract<
  DriveImportOutcome,
  { status: 'failed' }
>;

export const getFailedDriveImportOutcomes = (
  outcomes: readonly DriveImportOutcome[],
): DriveImportFailedOutcome[] =>
  outcomes.filter(
    (outcome): outcome is DriveImportFailedOutcome =>
      outcome.status === 'failed',
  );
