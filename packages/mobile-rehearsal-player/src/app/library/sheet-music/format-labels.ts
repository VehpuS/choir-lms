import type { SheetMusicFormat } from '@org/audio-library-models';

/** How a format is named to the user, in the manager and in the viewer. */
export const SHEET_MUSIC_FORMAT_LABELS: Record<SheetMusicFormat, string> = {
  link: 'Link',
  midi: 'MIDI',
  musescore: 'MuseScore',
  musicxml: 'MusicXML',
  pdf: 'PDF',
};
