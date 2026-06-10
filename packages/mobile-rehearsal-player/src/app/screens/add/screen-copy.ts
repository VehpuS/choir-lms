export const getAddScreenSummaryCopy = (options: {
  activeSearchQuery: string | null;
  resultCount: number;
}) => {
  if (!options.activeSearchQuery) {
    return {
      body: 'Browse or search My Drive and shared folders, then save promising tracks into Library without leaving this view.',
      title: 'Add from Google Drive',
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