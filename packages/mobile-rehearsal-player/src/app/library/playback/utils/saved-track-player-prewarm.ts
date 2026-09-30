const WEB_PLATFORM = 'web';

/**
 * Starts player setup in the background on web, so the lazily loaded Shaka
 * bundle and `setupPlayer()` are done before the first tap instead of after
 * it (8.33). Native is left alone: setup there is fast, and running it at
 * launch could take the audio session from another app's playback.
 */
export const prewarmSavedTrackPlayer = (options: {
  ensureReady: () => Promise<void>;
  isSupported: boolean;
  platformOs: string | null;
}) => {
  if (options.platformOs !== WEB_PLATFORM || !options.isSupported) {
    return false;
  }

  // A failed warm-up is retried by the first real load, which reports it.
  void options.ensureReady().catch(() => undefined);

  return true;
};
