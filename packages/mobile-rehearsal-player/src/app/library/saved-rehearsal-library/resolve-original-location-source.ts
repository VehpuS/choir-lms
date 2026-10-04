import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';

/**
 * The source whose Drive location answers `Show in Add` / `Open in Google
 * Drive`. An adjusted track has no provenance of its own, so the lookup (and
 * the refreshed location it saves) goes through its source track; any other
 * source answers for itself.
 */
export const resolveOriginalLocationSource = (
  source: DriveLibrarySource,
  savedSources: readonly DriveLibrarySource[],
): DriveLibrarySource => {
  if (!source.adjustment) {
    return source;
  }

  const { sourceRef } = source.adjustment;

  return savedSources.find(({ id }) => id === sourceRef) ?? source;
};
