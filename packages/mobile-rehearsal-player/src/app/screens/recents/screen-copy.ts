export const getRecentsContinuePracticingCopy = (options: {
  activePlayableItemTitle: string | null;
  hasRecentHistory: boolean;
  savedTrackCount: number;
}) => {
  if (options.hasRecentHistory) {
    return {
      body: null,
      title: 'Recent rehearsal',
    };
  }

  if (options.savedTrackCount === 0) {
    return {
      body: 'No recent rehearsal yet. Start in Add or Library.',
      title: 'No recent rehearsal yet',
    };
  }

  return {
    body: `${options.savedTrackCount} saved rehearsal ${options.savedTrackCount === 1 ? 'track is' : 'tracks are'} ready in Library. Open Library to continue practicing.`,
    title: 'Recent rehearsal entry points',
  };
};

export const getRecentsTagModuleCopy = (options: {
  hasSavedTagUsage: boolean;
}) => {
  if (!options.hasSavedTagUsage) {
    return {
      body: 'No tags yet. Tag a track, loop, playlist, or folder in Library to see it here.',
    };
  }

  return {
    body: 'Optional tag shortcuts for fast recents scanning.',
  };
};
