export const getHomeContinuePracticingCopy = (options: {
  activePlayableItemTitle: string | null;
  savedTrackCount: number;
}) => {
  if (options.activePlayableItemTitle) {
    return {
      body: `Resume ${options.activePlayableItemTitle} or jump to Library for another saved rehearsal item.`,
      title: 'Resume recent rehearsal',
    };
  }

  if (options.savedTrackCount === 0) {
    return {
      body: 'No recent rehearsal yet. Start in Search or Library.',
      title: 'No recent rehearsal yet',
    };
  }

  return {
    body: `${options.savedTrackCount} saved rehearsal ${options.savedTrackCount === 1 ? 'track is' : 'tracks are'} ready in Library. Open Library to continue practicing.`,
    title: 'Recent rehearsal entry points',
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
