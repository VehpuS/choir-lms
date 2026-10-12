// Returning from a folder opened out of search results restores "the
// originating query, scope and latest result set" (spec `mobile-practice-library`,
// task 8.21). Re-running the search instead made the results shrink to the
// first page and climb again. A search that had finished is restored from the
// result set the hook still holds; one still running is resumed by running it
// again, since its set was not complete.
export type SuspendedDriveSearch = {
  isComplete: boolean;
  query: string;
};

export const createSuspendedDriveSearch = (options: {
  hasIssue: boolean;
  isLoading: boolean;
  query: string;
}): SuspendedDriveSearch => ({
  isComplete: !options.isLoading && !options.hasIssue,
  query: options.query,
});

// The query whose next discovery run is skipped because its finished results
// are being restored, or null when the search must run.
export const resolveRestoredSearchToSkip = (
  suspended: SuspendedDriveSearch | null,
  restoredQuery: string | null,
): string | null =>
  suspended?.isComplete && suspended.query === restoredQuery
    ? suspended.query
    : null;
