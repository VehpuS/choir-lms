import {
  semitonePitchToMidi,
  type MusicXmlTranspose,
} from '@org/audio-library-models';

/** The attribute that marks a drawn notehead with its sounding MIDI number. */
export const NOTE_MIDI_ATTRIBUTE = 'data-midi';
// MusicXML octave 4 is OpenSheetMusicDisplay's octave 1.
const OSMD_OCTAVE_OFFSET = 3;

// The slice of OpenSheetMusicDisplay's graphical model read here, described
// structurally (the app's TypeScript config carries no DOM library, and the
// library's own types are not imported by the shared renderer).
type TaggableElement = { setAttribute(name: string, value: string): void };
type OsmdPitch = {
  AccidentalHalfTones: number;
  FundamentalNote: number;
  Octave: number;
};
type OsmdNote = {
  NoteTie?: { StartNote: unknown } | undefined;
  Pitch: OsmdPitch;
  isRest(): boolean;
};
type OsmdGraphicalNote = {
  getNoteheadSVGs?: () => readonly TaggableElement[] | undefined;
  sourceNote: OsmdNote;
};
type OsmdMeasure = {
  ParentStaff?: { ParentInstrument?: unknown };
  staffEntries: readonly {
    graphicalVoiceEntries: readonly { notes: readonly OsmdGraphicalNote[] }[];
  }[];
};

// A note outside the run that was drawn has no elements, and the library may
// throw instead of returning nothing; either way there is nothing to tag.
const readNoteheads = (note: OsmdGraphicalNote): readonly TaggableElement[] => {
  try {
    return note.getNoteheadSVGs?.() ?? [];
  } catch {
    return [];
  }
};

export type ScoreNoteTagOptions = {
  /** `GraphicSheet.MeasureList`: every measure, one entry per staff. */
  measures: readonly (readonly OsmdMeasure[])[];
  /** `Sheet.Instruments`, to tell which part a staff belongs to. */
  instruments: readonly unknown[];
  /** Each part's `<transpose>`, in part order. */
  transposes: readonly MusicXmlTranspose[];
};

/**
 * Marks each drawn notehead with the note it sounds, so a tap can be answered
 * from the DOM alone. The attribute survives the strip renderer copying a
 * drawn run's SVG into its slot, which object identity would not. A rest has
 * no notehead, and a tie continuation is skipped: it is the same sounding
 * note as the one it extends.
 */
export const tagScoreNoteheads = ({
  instruments,
  measures,
  transposes,
}: ScoreNoteTagOptions): void => {
  for (const row of measures) {
    for (const measure of row ?? []) {
      const partIndex = instruments.indexOf(
        measure.ParentStaff?.ParentInstrument,
      );
      const transpose = transposes[partIndex];

      for (const entry of measure.staffEntries ?? []) {
        for (const voiceEntry of entry.graphicalVoiceEntries ?? []) {
          for (const graphicalNote of voiceEntry.notes ?? []) {
            const note = graphicalNote.sourceNote;
            const isTieContinuation =
              note.NoteTie !== undefined && note.NoteTie.StartNote !== note;

            if (note.isRest() || isTieContinuation) {
              continue;
            }

            const midi = semitonePitchToMidi(
              {
                semitone: note.Pitch.FundamentalNote,
                alter: note.Pitch.AccidentalHalfTones,
                octave: note.Pitch.Octave + OSMD_OCTAVE_OFFSET,
              },
              transpose,
            );

            for (const head of readNoteheads(graphicalNote)) {
              head.setAttribute(NOTE_MIDI_ATTRIBUTE, String(midi));
            }
          }
        }
      }
    }
  }
};
