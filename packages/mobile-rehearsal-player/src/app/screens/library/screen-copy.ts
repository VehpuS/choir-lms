export const getLibraryScreenSummaryCopy = (options: {
  savedTrackCount: number;
}) => {
  if (options.savedTrackCount === 0) {
    return {
      body: 'Save a track from Add to start full-track playback, loops, and playlists in your rehearsal library.',
      title: 'Library is ready for your first track',
    };
  }

  return {
    body: `${options.savedTrackCount} saved rehearsal ${options.savedTrackCount === 1 ? 'track is' : 'tracks are'} ready for playback, loop capture, and playlist work here. Tracks, loops, and playlists stay grouped inside the same personal library destination.`,
    title: 'Your saved practice material lives here',
  };
};