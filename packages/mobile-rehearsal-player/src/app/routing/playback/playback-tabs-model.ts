/**
 * The wide-short playback view keeps the transport on the left and puts one
 * panel at a time on the right. The panels are the three surfaces the compact
 * sheet switches between (`now-playing`, `queue`, `shaping`) plus the two
 * things the now-playing sheet scrolls to (lyrics, and a composite's mix).
 */
export type PlaybackSurfaceKey = 'now-playing' | 'queue' | 'shaping';
export type PlaybackTabKey = 'lyrics' | 'mix' | 'queue' | 'shaping';

/** The tabs that live on the now-playing surface rather than a surface of their own. */
export type NowPlayingTabKey = Extract<PlaybackTabKey, 'lyrics' | 'mix'>;

export type PlaybackTab = {
  key: PlaybackTabKey;
  label: string;
};

const LYRICS_TAB: PlaybackTab = { key: 'lyrics', label: 'Lyrics' };
const MIX_TAB: PlaybackTab = { key: 'mix', label: 'Mix' };
const QUEUE_TAB: PlaybackTab = { key: 'queue', label: 'Queue' };
const SHAPING_TAB: PlaybackTab = { key: 'shaping', label: 'Speed & pitch' };

const DEFAULT_TAB: NowPlayingTabKey = 'lyrics';

/** The tabs for the playing item, in order: Lyrics, Mix (composites), Queue, Speed & pitch. */
export const getPlaybackTabs = (options: {
  hasQueue: boolean;
  isComposite: boolean;
}): PlaybackTab[] => {
  return [
    LYRICS_TAB,
    ...(options.isComposite ? [MIX_TAB] : []),
    ...(options.hasQueue ? [QUEUE_TAB] : []),
    SHAPING_TAB,
  ];
};

/**
 * The tab to show: the queue and shaping surfaces select their own tabs, and
 * the now-playing surface shows the last Lyrics or Mix choice (Lyrics when
 * that tab no longer exists, for example after the composite stopped playing).
 */
export const getSelectedPlaybackTab = (options: {
  nowPlayingTab: NowPlayingTabKey;
  surface: PlaybackSurfaceKey;
  tabs: readonly PlaybackTab[];
}): PlaybackTabKey => {
  const { nowPlayingTab, surface, tabs } = options;
  const has = (key: PlaybackTabKey) => tabs.some((tab) => tab.key === key);

  if (surface === 'shaping') {
    return 'shaping';
  }

  if (surface === 'queue') {
    return has('queue') ? 'queue' : DEFAULT_TAB;
  }

  return has(nowPlayingTab) ? nowPlayingTab : DEFAULT_TAB;
};

/** What pressing a tab asks for: a surface, and for Lyrics and Mix which one of those. */
export const getPlaybackTabTarget = (
  key: PlaybackTabKey,
): { nowPlayingTab: NowPlayingTabKey | null; surface: PlaybackSurfaceKey } => {
  switch (key) {
    case 'queue':
      return { nowPlayingTab: null, surface: 'queue' };
    case 'shaping':
      return { nowPlayingTab: null, surface: 'shaping' };
    case 'mix':
      return { nowPlayingTab: 'mix', surface: 'now-playing' };
    case 'lyrics':
      return { nowPlayingTab: 'lyrics', surface: 'now-playing' };
  }
};
