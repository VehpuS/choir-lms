export const getDriveImportReviewHeaderCopy = () => ({
  helper: 'Choose where these Drive folders and tracks go in Library.',
  title: 'Review import',
});

export const getDriveImportReviewDestinationCopy = () => ({
  emptyHelper: 'Create a Library folder first to choose an import destination.',
  title: 'Library destination',
});

export const getDriveImportReviewModeCopy = () => ({
  flattenLabel: 'Flatten',
  preserveStructureLabel: 'Preserve structure',
  title: 'Folder structure',
});

export const getDriveImportReviewSummaryStatusCopy = (
  status: 'error' | 'idle',
) => {
  switch (status) {
    case 'idle':
      return 'Choose a Library destination to see the import summary.';
    case 'error':
      return 'The import review could not be prepared.';
  }
};
