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
    message: `${options.trackName} was saved to your rehearsal library.`,
    title: 'Track saved',
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

  if (!options.previouslySavedIds) {
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
