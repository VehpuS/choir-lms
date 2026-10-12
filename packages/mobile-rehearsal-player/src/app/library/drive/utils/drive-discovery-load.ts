import {
  browseDriveLocation,
  searchDriveAudioFiles,
  type DriveBrowseLocation,
  type DriveBrowseSnapshot,
  type DrivePathSegment,
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
  /** The path of the folder being listed, from the navigation stack. */
  browsePath: readonly DrivePathSegment[];
  onBrowseSnapshot: (snapshot: DriveBrowseSnapshot) => void;
  onSearchSnapshot: (snapshot: DriveSearchSnapshot) => void;
  pathCache: PathCache;
  request: DiscoveryRequest;
};

const withBrowsePath = (
  snapshot: DriveBrowseSnapshot,
  path: readonly DrivePathSegment[],
): DriveBrowseSnapshot => {
  const attach = <Source extends { path?: DrivePathSegment[] }>(
    source: Source,
  ): Source => ({ ...source, path: [...path] });

  return {
    ...snapshot,
    playableSources: snapshot.playableSources.map(attach),
    unavailableSources: snapshot.unavailableSources.map(attach),
  };
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
    // The audio rows show as soon as the folder is listed; their paths are
    // resolved behind. Until then each carries the browsed folder's path from
    // the navigation stack, so a Save made now still records where it came
    // from (task 8.49). Never replace an already listed location with it.
    onSources: (sourcesSnapshot) => {
      if (
        request.shouldApplyResult() &&
        !options.browseCache.has(browseCacheKey)
      ) {
        options.onBrowseSnapshot(
          withBrowsePath(sourcesSnapshot, options.browsePath),
        );
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
