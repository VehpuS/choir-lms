import {
  browseDriveLocation,
  searchDriveAudioFiles,
  type DriveBrowseLocation,
  type DriveBrowseSnapshot,
  type DriveSearchSnapshot,
} from '@org/google-drive';

import { runtimeConfig } from '../../../../config/runtime';
import {
  getDriveBrowseCacheKey,
  type createDriveBrowseCache,
} from './drive-browse-cache';
import type { createDriveDiscoveryRequest } from './drive-discovery-request';

type DiscoveryRequest = ReturnType<typeof createDriveDiscoveryRequest>;
type BrowseCache = ReturnType<typeof createDriveBrowseCache>;
type PathCache = NonNullable<
  Parameters<typeof browseDriveLocation>[0]['pathCache']
>;

type LoadDriveDiscoveryOptions = {
  accessToken: string;
  /** The query to search for, or null to list the current location. */
  activeSearchQuery: string | null;
  browseCache: BrowseCache;
  currentLocation: DriveBrowseLocation;
  onBrowseSnapshot: (snapshot: DriveBrowseSnapshot) => void;
  onSearchSnapshot: (snapshot: DriveSearchSnapshot) => void;
  pathCache: PathCache;
  request: DiscoveryRequest;
};

// One Drive discovery run: a search (publishing partial snapshots as pages
// arrive) or a folder listing (folders first, then the full snapshot). Results
// are applied only while the request is still the current one.
export const loadDriveDiscovery = async (
  options: LoadDriveDiscoveryOptions,
) => {
  const { request } = options;

  if (options.activeSearchQuery) {
    const nextSearchSnapshot = await searchDriveAudioFiles({
      accessToken: options.accessToken,
      location: options.currentLocation,
      onProgress: (progressSnapshot) => {
        if (request.shouldApplyResult()) {
          options.onSearchSnapshot(progressSnapshot);
        }
      },
      query: options.activeSearchQuery,
      supportedMimeTypes: runtimeConfig.supportedAudioMimeTypes,
      supportedExtensions: runtimeConfig.supportedAudioExtensions,
      signal: request.signal,
    });

    if (request.shouldApplyResult()) {
      options.onSearchSnapshot(nextSearchSnapshot);
    }

    return;
  }

  const browseCacheKey = getDriveBrowseCacheKey(options.currentLocation);
  const nextBrowseSnapshot = await browseDriveLocation({
    accessToken: options.accessToken,
    location: options.currentLocation,
    // Show folders as pages arrive, but never replace an already listed
    // location (a refresh) with a folders-only view.
    onFolders: (foldersSnapshot) => {
      if (
        request.shouldApplyResult() &&
        !options.browseCache.has(browseCacheKey)
      ) {
        options.onBrowseSnapshot(foldersSnapshot);
      }
    },
    pathCache: options.pathCache,
    supportedMimeTypes: runtimeConfig.supportedAudioMimeTypes,
    supportedExtensions: runtimeConfig.supportedAudioExtensions,
    signal: request.signal,
  });

  if (!request.shouldApplyResult()) {
    return;
  }

  options.browseCache.set(browseCacheKey, nextBrowseSnapshot);
  options.onBrowseSnapshot(nextBrowseSnapshot);
};
