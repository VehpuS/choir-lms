import {
  DRIVE_ROOT_LABELS,
  type DriveBrowseLocation,
  type DriveBrowseRootKind,
  type DriveBrowseSnapshot,
  type DriveDiscoveryResult,
  type DrivePathSegment,
} from '@org/google-drive';

const ROOT_ORDER: readonly DriveBrowseRootKind[] = ['my-drive', 'shared'];
const PATH_SEPARATOR = ' / ';

export type DriveBasketGroup = {
  entries: Array<{ pathLabel: string; result: DriveDiscoveryResult }>;
  label: string;
  rootKind: DriveBrowseRootKind;
};

export const getBrowseFolderPath = (
  navigationStack: readonly DriveBrowseLocation[],
): DrivePathSegment[] =>
  navigationStack
    .filter((location) => location.kind === 'folder')
    .map(({ id, name }) => ({ id, name }));

// Browse rows come from one folder, so they carry no path of their own. The
// basket needs it for overlap detection (a folder covers what is inside it)
// and for the basket view, so it is taken from the navigation stack.
export const attachBrowsePath = (
  result: DriveDiscoveryResult,
  navigationStack: readonly DriveBrowseLocation[],
): DriveDiscoveryResult => {
  if (result.path !== undefined) {
    return result;
  }

  const rootKind = navigationStack[0]?.rootKind ?? result.rootKind;

  return {
    ...result,
    path: getBrowseFolderPath(navigationStack),
    ...(rootKind === undefined ? {} : { rootKind }),
  };
};

export const createDriveBrowseResults = (
  snapshot: Pick<
    DriveBrowseSnapshot,
    'folders' | 'playableSources' | 'unavailableSources'
  >,
  navigationStack: readonly DriveBrowseLocation[],
): DriveDiscoveryResult[] =>
  [
    ...snapshot.folders.map(
      (folder): DriveDiscoveryResult => ({ ...folder, kind: 'folder' }),
    ),
    ...[...snapshot.playableSources, ...snapshot.unavailableSources].map(
      (source): DriveDiscoveryResult => ({ ...source, kind: 'audio' }),
    ),
  ].map((result) => attachBrowsePath(result, navigationStack));

export const createDriveBrowseContextKey = (
  location: Pick<DriveBrowseLocation, 'id' | 'kind' | 'rootKind'>,
) => ['browse', location.rootKind, location.kind, location.id].join(':');

export const getSelectedFolderIds = (
  selection: readonly DriveDiscoveryResult[],
): Set<string> =>
  new Set(
    selection.flatMap((result) =>
      result.kind === 'folder' ? [result.id] : [],
    ),
  );

// A row is covered when a selected folder contains it: the import takes the
// folder's whole subtree, so selecting the row too would only be an overlap.
export const isCoveredBySelectedFolder = (
  path: readonly DrivePathSegment[] | undefined,
  selectedFolderIds: ReadonlySet<string>,
) => path?.some((segment) => selectedFolderIds.has(segment.id)) ?? false;

// The selected folder that covers a row, by name, so the row can say why it
// cannot be picked on its own (task 8.67). The outermost one wins, since that
// is the folder the basket holds.
export const getCoveringFolderName = (
  path: readonly DrivePathSegment[] | undefined,
  selectedFolderIds: ReadonlySet<string>,
): string | undefined =>
  path?.find((segment) => selectedFolderIds.has(segment.id))?.name;

// Keys of selected items that sit inside another selected folder. Selecting a
// folder takes over what was selected beneath it, so the basket (and its
// count) holds the folder alone.
export const getKeysCoveredByBasketFolders = (
  selection: readonly DriveDiscoveryResult[],
): string[] => {
  const selectedFolderIds = getSelectedFolderIds(selection);

  return selection
    .filter((result) =>
      isCoveredBySelectedFolder(result.path, selectedFolderIds),
    )
    .map(({ id }) => id);
};

/** The name of the selected folder covering the folder being browsed, if any. */
export const getBrowseCoveringFolderName = (options: {
  navigationStack: readonly DriveBrowseLocation[];
  selectedFolderIds: ReadonlySet<string>;
}): string | undefined =>
  getCoveringFolderName(
    getBrowseFolderPath(options.navigationStack),
    options.selectedFolderIds,
  );

// The basket view: selected items grouped by root, then by folder path, with
// the path as the row's context line.
export const groupDriveBasket = (
  selection: readonly DriveDiscoveryResult[],
): DriveBasketGroup[] =>
  ROOT_ORDER.flatMap((rootKind) => {
    const entries = selection
      .filter((result) => (result.rootKind ?? 'my-drive') === rootKind)
      .map((result) => ({
        pathLabel: [
          DRIVE_ROOT_LABELS[rootKind],
          ...(result.path ?? []).map(({ name }) => name),
        ].join(PATH_SEPARATOR),
        result,
      }))
      .sort(
        (first, second) =>
          first.pathLabel.localeCompare(second.pathLabel) ||
          first.result.name.localeCompare(second.result.name),
      );

    return entries.length === 0
      ? []
      : [{ entries, label: DRIVE_ROOT_LABELS[rootKind], rootKind }];
  });
