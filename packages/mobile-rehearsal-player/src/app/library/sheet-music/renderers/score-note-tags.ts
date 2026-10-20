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

type TaggedNote = { graphicalNote: OsmdGraphicalNote; midi: number };

const isTieContinuation = (note: OsmdNote): boolean =>
  note.NoteTie !== undefined && note.NoteTie.StartNote !== note;

/**
 * Tags one voice entry: a single note, or a chord. For a chord the library
 * answers `getNoteheadSVGs()` with every head of the chord for each of its
 * notes, so tagging per note would leave the last (top) pitch on all of them.
 * The heads come back lowest first, the same order as the notes sorted by
 * pitch, so each head takes the pitch at its position.
 */
const tagVoiceEntry = (
  graphicalNotes: readonly OsmdGraphicalNote[],
  transpose: MusicXmlTranspose | undefined,
): void => {
  const pitched: TaggedNote[] = graphicalNotes
    .filter(({ sourceNote }) => !sourceNote.isRest())
    .map((graphicalNote) => ({
      graphicalNote,
      midi: semitonePitchToMidi(
        {
          semitone: graphicalNote.sourceNote.Pitch.FundamentalNote,
          alter: graphicalNote.sourceNote.Pitch.AccidentalHalfTones,
          octave: graphicalNote.sourceNote.Pitch.Octave + OSMD_OCTAVE_OFFSET,
        },
        transpose,
      ),
    }))
    .sort((a, b) => a.midi - b.midi);

  const sharedHeads = pitched[0] ? readNoteheads(pitched[0].graphicalNote) : [];

  if (pitched.length > 1 && sharedHeads.length === pitched.length) {
    pitched.forEach(({ graphicalNote, midi }, index) => {
      // A tie continuation sounds as the note it extends, so it stays untagged.
      if (!isTieContinuation(graphicalNote.sourceNote)) {
        sharedHeads[index]?.setAttribute(NOTE_MIDI_ATTRIBUTE, String(midi));
      }
    });
    return;
  }

  for (const { graphicalNote, midi } of pitched) {
    if (isTieContinuation(graphicalNote.sourceNote)) {
      continue;
    }

    for (const head of readNoteheads(graphicalNote)) {
      head.setAttribute(NOTE_MIDI_ATTRIBUTE, String(midi));
    }
  }
};

export type ScoreNoteTagOptions = {
  /** `GraphicSheet.MeasureList`: every measure, one entry per staff. */
  measures: readonly (readonly (OsmdMeasure | undefined)[] | undefined)[];
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
      // A hidden part's staff has no graphical measure in its row.
      if (!measure) {
        continue;
      }

      const partIndex = instruments.indexOf(
        measure.ParentStaff?.ParentInstrument,
      );
      const transpose = transposes[partIndex];

      for (const entry of measure.staffEntries ?? []) {
        for (const voiceEntry of entry.graphicalVoiceEntries ?? []) {
          tagVoiceEntry(voiceEntry.notes ?? [], transpose);
        }
      }
    }
  }
};
