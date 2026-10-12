// An empty folder used to render nothing under its header, which looks like a
// screen that failed to load (task 8.94).
export const FILES_EMPTY_FOLDER_MESSAGE = 'This folder is empty';

// Shown for a folder with no rows when nothing else explains the blank: not
// while searching (that has its own no-results line) and not mid-selection.
export const shouldShowEmptyFolder = (options: {
  isSelecting: boolean;
  rowCount: number;
  searchQuery: string | null;
}) => options.rowCount === 0 && !options.searchQuery && !options.isSelecting;
