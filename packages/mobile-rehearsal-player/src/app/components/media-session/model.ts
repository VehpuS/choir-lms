export type MediaSessionSnapshot = {
  durationSeconds: number;
  hasItem: boolean;
  isPlaying: boolean;
  playbackRate: number;
  positionSeconds: number;
  title: string | null;
};

export type MediaSessionPlaybackState = 'none' | 'paused' | 'playing';

// The app's display name for the lock screen; it will follow the app's name.
const MEDIA_SESSION_ARTIST = 'Choir LMS';

// Relative to the page, so it follows the base path the app is served from.
const ARTWORK = [
  { sizes: '192x192', src: 'icons/icon-192.png', type: 'image/png' },
  { sizes: '512x512', src: 'icons/icon-512.png', type: 'image/png' },
] as const;

/** What the lock screen and media keys show about the current item. */
export const toMediaMetadata = (title: string) => ({
  artist: MEDIA_SESSION_ARTIST,
  artwork: ARTWORK.map((image) => ({ ...image })),
  title,
});

export const toPlaybackState = (
  snapshot: Pick<MediaSessionSnapshot, 'hasItem' | 'isPlaying'>,
): MediaSessionPlaybackState => {
  if (!snapshot.hasItem) {
    return 'none';
  }

  return snapshot.isPlaying ? 'playing' : 'paused';
};

/**
 * The scrubber the lock screen draws, or null while the length is unknown. The
 * browser throws on a position past the end or a non-positive length or rate,
 * so values are clamped here.
 */
export const toPositionState = (
  snapshot: Pick<
    MediaSessionSnapshot,
    'durationSeconds' | 'playbackRate' | 'positionSeconds'
  >,
) => {
  const { durationSeconds, playbackRate, positionSeconds } = snapshot;

  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    !Number.isFinite(playbackRate) ||
    playbackRate <= 0
  ) {
    return null;
  }

  return {
    duration: durationSeconds,
    playbackRate,
    position: Math.min(
      durationSeconds,
      Math.max(0, Number.isFinite(positionSeconds) ? positionSeconds : 0),
    ),
  };
};

/** How far the reported position may drift from where playback really is. */
const POSITION_DRIFT_SECONDS = 2;

/**
 * Whether the lock screen's scrubber needs a fresh position. The browser
 * advances it by itself while playing, so only a jump (a seek, a loop turning
 * over) or a change of state needs reporting, not every progress tick.
 */
export const shouldReportPosition = (options: {
  actualSeconds: number;
  elapsedSecondsSinceReport: number;
  isPlaying: boolean;
  playbackRate: number;
  reportedSeconds: number | null;
}) => {
  if (options.reportedSeconds === null) {
    return true;
  }

  const expected = options.isPlaying
    ? options.reportedSeconds +
      options.elapsedSecondsSinceReport * options.playbackRate
    : options.reportedSeconds;

  return Math.abs(options.actualSeconds - expected) > POSITION_DRIFT_SECONDS;
};
