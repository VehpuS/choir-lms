export const getHomeContinuePracticingCopy = (options: {
  activePlayableItemTitle: string | null;
  savedTrackCount: number;
}) => {
  if (options.activePlayableItemTitle) {
    return {
      body: `Resume ${options.activePlayableItemTitle} from the mini-player.`,
      title: 'Continue practicing',
    };
  }

  if (options.savedTrackCount === 0) {
    return {
      body: 'Browse My Drive or shared folders below, then save a track to start full-track playback, loop capture, and playlists in your personal rehearsal library.',
      title: 'Start your library',
    };
  }

  return {
    body: `${options.savedTrackCount} saved rehearsal ${options.savedTrackCount === 1 ? 'track is' : 'tracks are'} waiting in Library for full-track playback, loop capture, and playlist playback.`,
    title: 'Continue practicing',
  };
};

export const getSearchScreenSummaryCopy = (options: {
  activeSearchQuery: string | null;
  resultCount: number;
}) => {
  if (!options.activeSearchQuery) {
    return {
      body: 'Search across My Drive and shared folders, then save promising tracks into Library without leaving this result view.',
      title: 'Search the rehearsal catalog',
    };
  }

  if (options.resultCount === 0) {
    return {
      body: `No supported rehearsal audio matched "${options.activeSearchQuery}" yet. Try a shorter choir, section, or piece name, or clear the search to start over.`,
      title: 'No matching rehearsal tracks yet',
    };
  }

  return {
    body: `${options.resultCount} result${options.resultCount === 1 ? '' : 's'} matched "${options.activeSearchQuery}". Save the tracks you want to keep rehearsing, then switch to Library for full-track playback and loop work.`,
    title: 'Search results ready',
  };
};

export const getLibraryScreenSummaryCopy = (options: {
  savedTrackCount: number;
}) => {
  if (options.savedTrackCount === 0) {
    return {
      body: 'Save a track from Home or Search to start full-track playback, loops, and playlists in your rehearsal library.',
      title: 'Library is ready for your first track',
    };
  }

  return {
    body: `${options.savedTrackCount} saved rehearsal ${options.savedTrackCount === 1 ? 'track is' : 'tracks are'} ready for playback, loop capture, and playlist work here. Tracks, loops, and playlists stay grouped inside the same personal library destination.`,
    title: 'Your saved practice material lives here',
  };
};
