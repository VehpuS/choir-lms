export type DriveTrackSavedFeedback = {
  id: string;
  message: string;
  title: string;
};

export const createDriveTrackSavedFeedback = (options: {
  trackId: string;
  trackName: string;
}): DriveTrackSavedFeedback => {
  return {
    id: options.trackId,
    // Screen 1e: the title states the outcome and the message names the file.
    message: options.trackName,
    title: 'Saved to library',
  };
};

// The row's own "Save" -> management-icon swap already reacts to
// `savedLibrarySources`, so this reuses that same reactive list to detect a
// just-completed save rather than needing a separate success callback
// threaded through the shared library controller.
export const resolveNewlySavedSource = <
  Source extends { id: string; name: string },
>(
  previouslySavedIds: Set<string>,
  currentSources: Source[],
): Source | null => {
  return (
    currentSources.find((source) => {
      return !previouslySavedIds.has(source.id);
    }) ?? null
  );
};

export type TrackSaveDetectionResult<Source> = {
  // null while still loading, so the caller knows not to persist a
  // (possibly still-empty) baseline yet.
  nextBaselineIds: Set<string> | null;
  newlySavedSource: Source | null;
};

// `currentSources` starts empty and populates once the library's initial
// load resolves. Establishing the baseline against that empty list would
// make every pre-existing saved source look newly-saved the moment it
// loads, so this only updates the baseline once loading has finished, and
// treats the first post-load run as establishing the baseline rather than a
// save (so reopening Add doesn't treat pre-existing saves as new).
export const resolveTrackSaveDetection = <
  Source extends { id: string; name: string },
>(options: {
  currentSources: Source[];
  isLoading: boolean;
  // True while something other than the row's own save is adding tracks (a
  // bulk import): the baseline still advances, but no save is reported.
  isSuppressed?: boolean;
  previouslySavedIds: Set<string> | null;
}): TrackSaveDetectionResult<Source> => {
  if (options.isLoading) {
    return {
      newlySavedSource: null,
      nextBaselineIds: options.previouslySavedIds,
    };
  }

  const nextBaselineIds = new Set(
    options.currentSources.map((source) => source.id),
  );

  if (!options.previouslySavedIds || options.isSuppressed) {
    return { newlySavedSource: null, nextBaselineIds };
  }

  return {
    newlySavedSource: resolveNewlySavedSource(
      options.previouslySavedIds,
      options.currentSources,
    ),
    nextBaselineIds,
  };
};

// A `Saved to library` card names one track; once that track is gone from the
// library (removed from its row menu) the card no longer describes anything.
// While the library is still loading the list is empty, which says nothing.
export const isAcknowledgedTrackStillSaved = (options: {
  currentSources: readonly { id: string }[];
  isLoading: boolean;
  trackId: string;
}): boolean =>
  options.isLoading ||
  options.currentSources.some((source) => source.id === options.trackId);
