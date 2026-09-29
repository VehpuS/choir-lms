// App-wide icon vocabulary. The names are the semantic keys the app already
// used with MaterialCommunityIcons, so call sites and icon-name unions keep
// working while every glyph now renders from Phosphor (Nocturne's icon set).
// The glyph map stays free of React Native imports so the icon-semantics
// distinctness rules can be asserted in plain node tests.

export type PhosphorGlyph =
  | 'ArrowClockwise'
  | 'ArrowCounterClockwise'
  | 'ArrowsClockwise'
  | 'CaretDown'
  | 'CaretLeft'
  | 'CaretRight'
  | 'CaretUp'
  | 'CheckCircle'
  | 'Circle'
  | 'ClockCountdown'
  | 'ClockCounterClockwise'
  | 'DotsSixVertical'
  | 'DotsThreeVertical'
  | 'Folder'
  | 'FolderPlus'
  | 'MagnifyingGlass'
  | 'Minus'
  | 'MusicNote'
  | 'MusicNotes'
  | 'Pause'
  | 'Play'
  | 'PlayCircle'
  | 'Playlist'
  | 'Plus'
  | 'Queue'
  | 'Repeat'
  | 'RepeatOnce'
  | 'Shuffle'
  | 'SkipBack'
  | 'SkipForward'
  | 'SlidersHorizontal'
  | 'SortAscending'
  | 'SortDescending'
  | 'SpeakerHigh'
  | 'SpeakerLow'
  | 'SpeakerX'
  | 'Tag'
  | 'UserCircle'
  | 'Waveform'
  | 'X'
  | 'XCircle';

export type AppIconWeight = 'fill' | 'regular';

export type AppIconGlyph = {
  glyph: PhosphorGlyph;
  // Rehearsal skip controls carry their jump length as a numeral inside the
  // arrow, mirroring the platform "go back / forward 15" symbols.
  skipSeconds?: number;
  weight: AppIconWeight;
};

const REHEARSAL_SKIP_SECONDS = 15;

const regular = (glyph: PhosphorGlyph): AppIconGlyph => ({
  glyph,
  weight: 'regular',
});

const filled = (glyph: PhosphorGlyph): AppIconGlyph => ({
  glyph,
  weight: 'fill',
});

export const APP_ICON_GLYPHS = {
  // Transport: filled weight per design Decision 3.
  pause: filled('Pause'),
  play: filled('Play'),
  // The same glyph at regular weight, for a play action that is not the
  // current primary (playlist detail's neutral `Ordered`).
  'play-outline': regular('Play'),
  'play-circle-outline': regular('PlayCircle'),
  'skip-previous': filled('SkipBack'),
  'skip-next': filled('SkipForward'),
  'rewind-15': {
    glyph: 'ArrowCounterClockwise',
    skipSeconds: REHEARSAL_SKIP_SECONDS,
    weight: 'regular',
  },
  'fast-forward-15': {
    glyph: 'ArrowClockwise',
    skipSeconds: REHEARSAL_SKIP_SECONDS,
    weight: 'regular',
  },
  replay: regular('ArrowCounterClockwise'),

  // Session modes: repeat states share the repeat family; shuffle alone uses
  // the crossing-arrows glyph.
  repeat: regular('Repeat'),
  'repeat-once': regular('RepeatOnce'),
  shuffle: regular('Shuffle'),

  // Row management.
  'dots-vertical': regular('DotsThreeVertical'),
  'drag-vertical': regular('DotsSixVertical'),
  'chevron-up': regular('CaretUp'),
  'chevron-down': regular('CaretDown'),
  'chevron-left': regular('CaretLeft'),
  'chevron-right': regular('CaretRight'),
  plus: regular('Plus'),
  minus: regular('Minus'),

  // Entities and navigation.
  'folder-outline': regular('Folder'),
  'folder-plus': filled('FolderPlus'),
  'folder-plus-outline': regular('FolderPlus'),
  history: regular('ClockCounterClockwise'),
  'history-filled': filled('ClockCounterClockwise'),
  'music-note': filled('MusicNote'),
  'music-note-outline': regular('MusicNote'),
  'music-note-multiple': filled('MusicNotes'),
  'music-note-multiple-outline': regular('MusicNotes'),
  'playlist-music-outline': regular('Playlist'),
  'tag-outline': regular('Tag'),
  'view-list': regular('Queue'),
  waveform: regular('Waveform'),

  // Account.
  'account-circle-outline': regular('UserCircle'),

  // Selection.
  'check-circle': filled('CheckCircle'),
  'circle-outline': regular('Circle'),

  // Search, filter, sort, refresh.
  close: regular('X'),
  'close-circle-outline': regular('XCircle'),
  magnify: regular('MagnifyingGlass'),
  'tune-variant': regular('SlidersHorizontal'),
  'sort-ascending': regular('SortAscending'),
  'sort-descending': regular('SortDescending'),
  refresh: regular('ArrowsClockwise'),
  'progress-clock': regular('ClockCountdown'),

  // Volume.
  'volume-high': regular('SpeakerHigh'),
  'volume-low': regular('SpeakerLow'),
  'volume-off': regular('SpeakerX'),
} satisfies Record<string, AppIconGlyph>;

export type AppIconName = keyof typeof APP_ICON_GLYPHS;

export const resolveAppIconGlyph = (name: AppIconName): AppIconGlyph => {
  return APP_ICON_GLYPHS[name];
};

// Numeral inside a skip glyph, sized so it fits within the arrow's circle.
const SKIP_SECONDS_LABEL_SCALE = 0.34;

export const resolveSkipSecondsLabelSize = (iconSize: number) => {
  return Math.round(iconSize * SKIP_SECONDS_LABEL_SCALE);
};
