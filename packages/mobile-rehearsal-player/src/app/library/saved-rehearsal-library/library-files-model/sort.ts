import type {
  LibraryFilesRow,
  LibraryFilesSortDirection,
  LibraryFilesSortMode,
} from './types';

export const DEFAULT_LIBRARY_FILES_SORT_MODE: LibraryFilesSortMode = 'name';
export const DEFAULT_LIBRARY_FILES_SORT_DIRECTION: LibraryFilesSortDirection =
  'asc';

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

export const parseTimestamp = (value?: string) => {
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
  directionMultiplier: number,
) => {
  const leftTypeOrder = NON_FOLDER_TYPE_ORDER[left.kind];
  const rightTypeOrder = NON_FOLDER_TYPE_ORDER[right.kind];

  if (leftTypeOrder !== rightTypeOrder) {
    return (leftTypeOrder - rightTypeOrder) * directionMultiplier;
  }

  return compareRowsByName(left, right);
};

const compareRowsByTimestamp = (
  leftTimestamp: number,
  rightTimestamp: number,
  left: LibraryFilesRow,
  right: LibraryFilesRow,
  directionMultiplier: number,
) => {
  if (leftTimestamp !== rightTimestamp) {
    return (leftTimestamp - rightTimestamp) * directionMultiplier;
  }

  return compareRowsByName(left, right);
};

export const sortRows = (options: {
  openedAtByNodeKey?: Readonly<Record<string, string>>;
  rows: LibraryFilesRow[];
  sortDirection?: LibraryFilesSortDirection;
  sortMode?: LibraryFilesSortMode;
}) => {
  const sortMode = options.sortMode ?? DEFAULT_LIBRARY_FILES_SORT_MODE;
  const sortDirection =
    options.sortDirection ?? DEFAULT_LIBRARY_FILES_SORT_DIRECTION;
  const directionMultiplier = sortDirection === 'asc' ? 1 : -1;
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
          ? compareRowsByName(left, right) * directionMultiplier
          : compareRowsByType(left, right, directionMultiplier);
      case 'date-added':
        return compareRowsByTimestamp(
          resolveRowDateAddedTimestamp(left),
          resolveRowDateAddedTimestamp(right),
          left,
          right,
          directionMultiplier,
        );
      case 'date-opened':
        return compareRowsByTimestamp(
          resolveRowDateOpenedTimestamp(left, openedAtByNodeKey),
          resolveRowDateOpenedTimestamp(right, openedAtByNodeKey),
          left,
          right,
          directionMultiplier,
        );
      case 'name':
      default:
        return compareRowsByName(left, right) * directionMultiplier;
    }
  };

  return [
    ...[...folderRows].sort(compareRows),
    ...[...fileRows].sort(compareRows),
  ];
};
