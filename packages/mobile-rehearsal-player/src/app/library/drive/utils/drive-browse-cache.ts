import type {
  DriveBrowseLocation,
  DriveBrowseSnapshot,
} from '@org/google-drive';

export type DriveBrowseCache = Map<string, DriveBrowseSnapshot>;

export const createDriveBrowseCache = (): DriveBrowseCache => new Map();

export const getDriveBrowseCacheKey = (location: DriveBrowseLocation) => {
  return `${location.rootKind}:${location.id}`;
};

export const createEmptyDriveBrowseSnapshot = (
  location: DriveBrowseLocation,
): DriveBrowseSnapshot => {
  return {
    location,
    folders: [],
    playableSources: [],
    unavailableSources: [],
  };
};

export type VisibleDriveBrowse = {
  /** True while the snapshot does not belong to the location yet. */
  isAwaitingLocation: boolean;
  snapshot: DriveBrowseSnapshot;
};

/**
 * Picks what the browse list shows for `currentLocation` in the same render
 * that navigated there (design Decision 13): the loaded snapshot when it is for
 * this location, else the session cache's earlier listing, else nothing. Rows
 * from a different location are never returned.
 */
export const resolveVisibleDriveBrowse = (options: {
  cache: DriveBrowseCache;
  currentLocation: DriveBrowseLocation;
  loadedSnapshot: DriveBrowseSnapshot;
}): VisibleDriveBrowse => {
  const key = getDriveBrowseCacheKey(options.currentLocation);

  if (getDriveBrowseCacheKey(options.loadedSnapshot.location) === key) {
    return { isAwaitingLocation: false, snapshot: options.loadedSnapshot };
  }

  const cachedSnapshot = options.cache.get(key);

  if (cachedSnapshot) {
    return { isAwaitingLocation: false, snapshot: cachedSnapshot };
  }

  return {
    isAwaitingLocation: true,
    snapshot: createEmptyDriveBrowseSnapshot(options.currentLocation),
  };
};
