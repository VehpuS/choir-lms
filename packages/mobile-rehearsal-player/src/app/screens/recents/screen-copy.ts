export const getRecentsContinuePracticingCopy = (options: {
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
      body: 'No recent rehearsal yet. Start in Add or Library.',
      title: 'No recent rehearsal yet',
    };
  }

  return {
    body: `${options.savedTrackCount} saved rehearsal ${options.savedTrackCount === 1 ? 'track is' : 'tracks are'} ready in Library. Open Library to continue practicing.`,
    title: 'Recent rehearsal entry points',
  };
};

export const getRecentsShortcutPlayActionCopy = (options: {
  isResumePlaybackAvailable: boolean;
  shortcutTag: string;
}) => {
  return {
    accessibilityLabel: `Play ${options.shortcutTag} shortcut`,
    disabled: !options.isResumePlaybackAvailable,
  };
};