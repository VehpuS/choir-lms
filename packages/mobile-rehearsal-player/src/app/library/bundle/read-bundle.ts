import {
  parseLibraryBundle,
  type LibraryBundle,
  type LibraryBundleDropCounts,
} from '@org/audio-library-models';
import type { DriveBundleListing } from '@org/google-drive';

import {
  describeBundleFailure,
  type BundleCancelled,
  type BundleFailure,
  type BundleServiceDependencies,
} from './bundle-service-types';

export type ReadBundleResult =
  | {
      status: 'ok';
      bundle: LibraryBundle;
      bundleName: string;
      dropped: LibraryBundleDropCounts;
      droppedTotal: number;
      /** The user's own backup, as opposed to someone else's bundle. */
      isOwn: boolean;
    }
  | { status: 'refused'; message: string }
  | BundleFailure
  | BundleCancelled;

/** Lists the bundles the user can open: their own and those shared with them. */
export const listBundleChoices = async (
  deps: BundleServiceDependencies,
  signal?: AbortSignal,
): Promise<
  | { status: 'ok'; bundles: DriveBundleListing[] }
  | BundleFailure
  | BundleCancelled
> => {
  const listed = await deps.drive.list(signal);

  if (listed.status === 'aborted') {
    return { status: 'cancelled' };
  }

  return listed.status === 'failed'
    ? describeBundleFailure(listed.reason)
    : { status: 'ok', bundles: listed.bundles };
};

/** Reads and parses one bundle at the boundary: refused text never reaches a plan. */
export const readBundle = async (
  deps: BundleServiceDependencies,
  listing: DriveBundleListing,
  signal?: AbortSignal,
): Promise<ReadBundleResult> => {
  const read = await deps.drive.read(listing.id, signal);

  if (read.status === 'aborted') {
    return { status: 'cancelled' };
  }

  if (read.status === 'failed') {
    return describeBundleFailure(read.reason);
  }

  const parsed = parseLibraryBundle(read.text);

  return parsed.status === 'refused'
    ? { status: 'refused', message: parsed.message }
    : {
        status: 'ok',
        bundle: parsed.bundle,
        bundleName: listing.name,
        dropped: parsed.dropped,
        droppedTotal: parsed.droppedTotal,
        isOwn: listing.origin === 'mine',
      };
};

/** Counts for a preview line. */
export const countBundleContents = (bundle: LibraryBundle) => ({
  tracks: bundle.sources.filter((source) => !source.adjustment).length,
  loops: bundle.loops.length,
  playlists: bundle.playlists.length,
  composites: bundle.composites.length,
  recordings: bundle.recordings?.length ?? 0,
});
