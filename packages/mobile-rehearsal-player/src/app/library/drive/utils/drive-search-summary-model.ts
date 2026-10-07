// The one line a Drive search reports above its results (design Decision 14):
// the same form while discovery runs and after it ends, so the list below it
// never moves. Empty and failed-with-nothing states keep their own card because
// there is no list under them to push.

export type DriveSearchSummary = {
  isRunning: boolean;
  label: string;
  /** Discovery failed after some results arrived; the line offers a retry. */
  stoppedEarly: boolean;
};

type DriveSearchSummaryOptions = {
  hasIssue: boolean;
  isLoading: boolean;
  isSearchActive: boolean;
  resultFolderCount: number;
  resultTrackCount: number;
  unavailableCount: number;
};

const SEARCHING_LABEL = 'Searching…';
const SUMMARY_SEPARATOR = ' · ';
const UNAVAILABLE_LABEL = 'unavailable';

const pluralize = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

export const getDriveSearchSummary = (
  options: DriveSearchSummaryOptions,
): DriveSearchSummary | null => {
  if (!options.isSearchActive) {
    return null;
  }

  const resultCount = options.resultFolderCount + options.resultTrackCount;

  if (resultCount === 0) {
    return options.isLoading
      ? { isRunning: true, label: SEARCHING_LABEL, stoppedEarly: false }
      : null;
  }

  const parts = [
    options.resultFolderCount > 0
      ? pluralize(options.resultFolderCount, 'folder')
      : undefined,
    options.resultTrackCount > 0
      ? pluralize(options.resultTrackCount, 'track')
      : undefined,
    options.unavailableCount > 0
      ? `${options.unavailableCount} ${UNAVAILABLE_LABEL}`
      : undefined,
  ].filter((part): part is string => part !== undefined);

  return {
    isRunning: options.isLoading,
    label: parts.join(SUMMARY_SEPARATOR),
    stoppedEarly: options.hasIssue && !options.isLoading,
  };
};
