import type { LibraryFilesRow, LibraryFilesSortMode } from './types';

export const DEFAULT_LIBRARY_FILES_SORT_MODE: LibraryFilesSortMode = 'name';

const NON_FOLDER_TYPE_ORDER: Record<
  Exclude<LibraryFilesRow['kind'], 'folder'>,
  number
> = {
  track: 0,
  loop: 1,
  playlist: 2,
};

const normalizeName = (value: string) => {
  return value.toLocaleLowerCase();
};

const compareLabels = (leftLabel: string, rightLabel: string) => {
  return normalizeName(leftLabel).localeCompare(normalizeName(rightLabel));
};

const parseTimestamp = (value?: string) => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsedValue = Date.parse(value);

  return Number.isNaN(parsedValue) ? Number.NEGATIVE_INFINITY : parsedValue;
};

export const getLibraryFilesRowNodeKey = (row: LibraryFilesRow) => {
  return row.kind === 'folder' ? row.folder.id : row.fileLink.id;
};

const resolveRowDateAddedTimestamp = (row: LibraryFilesRow) => {
  switch (row.kind) {
    case 'folder':
      return Number.NEGATIVE_INFINITY;
    case 'track':
      return parseTimestamp(row.source.modifiedTime);
    case 'loop':
      return parseTimestamp(row.loop.createdAt);
    case 'playlist':
      return parseTimestamp(row.playlist.createdAt);
  }
};

const resolveRowDateOpenedTimestamp = (
  row: LibraryFilesRow,
  openedAtByNodeKey: Readonly<Record<string, string>>,
) => {
  return parseTimestamp(openedAtByNodeKey[getLibraryFilesRowNodeKey(row)]);
};

const compareRowsByName = (left: LibraryFilesRow, right: LibraryFilesRow) => {
  return compareLabels(left.label, right.label);
};

const compareRowsByType = (
  left: Exclude<LibraryFilesRow, { kind: 'folder' }>,
  right: Exclude<LibraryFilesRow, { kind: 'folder' }>,
) => {
  const leftTypeOrder = NON_FOLDER_TYPE_ORDER[left.kind];
  const rightTypeOrder = NON_FOLDER_TYPE_ORDER[right.kind];

  if (leftTypeOrder !== rightTypeOrder) {
    return leftTypeOrder - rightTypeOrder;
  }

  return compareRowsByName(left, right);
};

const compareRowsByDescendingTimestamp = (
  leftTimestamp: number,
  rightTimestamp: number,
  left: LibraryFilesRow,
  right: LibraryFilesRow,
) => {
  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  return compareRowsByName(left, right);
};

export const sortRows = (options: {
  openedAtByNodeKey?: Readonly<Record<string, string>>;
  rows: LibraryFilesRow[];
  sortMode?: LibraryFilesSortMode;
}) => {
  const sortMode = options.sortMode ?? DEFAULT_LIBRARY_FILES_SORT_MODE;
  const openedAtByNodeKey = options.openedAtByNodeKey ?? {};
  const folderRows = options.rows.filter((row) => {
    return row.kind === 'folder';
  });
  const fileRows = options.rows.filter((row) => {
    return row.kind !== 'folder';
  });
  const compareRows = (left: LibraryFilesRow, right: LibraryFilesRow) => {
    switch (sortMode) {
      case 'type':
        return left.kind === 'folder' || right.kind === 'folder'
          ? compareRowsByName(left, right)
          : compareRowsByType(left, right);
      case 'date-added':
        return compareRowsByDescendingTimestamp(
          resolveRowDateAddedTimestamp(left),
          resolveRowDateAddedTimestamp(right),
          left,
          right,
        );
      case 'date-opened':
        return compareRowsByDescendingTimestamp(
          resolveRowDateOpenedTimestamp(left, openedAtByNodeKey),
          resolveRowDateOpenedTimestamp(right, openedAtByNodeKey),
          left,
          right,
        );
      case 'name':
      default:
        return compareRowsByName(left, right);
    }
  };

  return [
    ...[...folderRows].sort(compareRows),
    ...[...fileRows].sort(compareRows),
  ];
};
