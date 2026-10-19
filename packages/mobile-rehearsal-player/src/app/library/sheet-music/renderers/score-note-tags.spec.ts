import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NOTE_MIDI_ATTRIBUTE, tagScoreNoteheads } from './score-note-tags.js';

const createHead = () => {
  const attributes: Record<string, string> = {};

  return {
    attributes,
    setAttribute: (name: string, value: string) => {
      attributes[name] = value;
    },
  };
};

type FakeNote = {
  sourceNote: {
    NoteTie?: { StartNote: unknown };
    Pitch: {
      AccidentalHalfTones: number;
      FundamentalNote: number;
      Octave: number;
    };
    isRest: () => boolean;
  };
  getNoteheadSVGs: () => ReturnType<typeof createHead>[];
};

/** A note: `fundamental` is semitones above C, `octave` the OSMD octave. */
const createNote = (options: {
  accidental?: number;
  fundamental: number;
  isRest?: boolean;
  octave: number;
  tie?: 'start' | 'continue';
}) => {
  const head = createHead();
  const note: FakeNote = {
    sourceNote: {
      Pitch: {
        AccidentalHalfTones: options.accidental ?? 0,
        FundamentalNote: options.fundamental,
        Octave: options.octave,
      },
      isRest: () => options.isRest ?? false,
    },
    getNoteheadSVGs: () => [head],
  };

  if (options.tie === 'start') {
    note.sourceNote.NoteTie = { StartNote: note.sourceNote };
  } else if (options.tie === 'continue') {
    note.sourceNote.NoteTie = { StartNote: {} };
  }

  return { head, note };
};

const measureOf = (instrument: unknown, notes: FakeNote[]) => ({
  ParentStaff: { ParentInstrument: instrument },
  staffEntries: [{ graphicalVoiceEntries: [{ notes }] }],
});

describe('score notehead tags', () => {
  it('tags a notehead with its sounding MIDI number', () => {
    const instrument = {};
    // OSMD octave 1 is MusicXML octave 4, so G (7) in it is G4 = 67.
    const g4 = createNote({ fundamental: 7, octave: 1 });
    const bFlat4 = createNote({ accidental: -1, fundamental: 11, octave: 1 });

    tagScoreNoteheads({
      instruments: [instrument],
      measures: [[measureOf(instrument, [g4.note, bFlat4.note])]],
      transposes: [{}],
    });

    assert.equal(g4.head.attributes[NOTE_MIDI_ATTRIBUTE], '67');
    assert.equal(bFlat4.head.attributes[NOTE_MIDI_ATTRIBUTE], '70');
  });

  it("adds the note's part transposition", () => {
    const [soprano, clarinet] = [{}, {}];
    const written = createNote({ fundamental: 0, octave: 2 });

    tagScoreNoteheads({
      instruments: [soprano, clarinet],
      measures: [[measureOf(clarinet, [written.note])]],
      transposes: [{}, { chromatic: -2 }],
    });

    // Written C5 sounds B♭4.
    assert.equal(written.head.attributes[NOTE_MIDI_ATTRIBUTE], '70');
  });

  it('leaves rests and tie continuations untagged but tags a tie start', () => {
    const instrument = {};
    const rest = createNote({ fundamental: 0, isRest: true, octave: 1 });
    const start = createNote({ fundamental: 0, octave: 1, tie: 'start' });
    const continuation = createNote({
      fundamental: 0,
      octave: 1,
      tie: 'continue',
    });

    tagScoreNoteheads({
      instruments: [instrument],
      measures: [
        [measureOf(instrument, [rest.note, start.note, continuation.note])],
      ],
      transposes: [{}],
    });

    assert.equal(rest.head.attributes[NOTE_MIDI_ATTRIBUTE], undefined);
    assert.equal(start.head.attributes[NOTE_MIDI_ATTRIBUTE], '60');
    assert.equal(continuation.head.attributes[NOTE_MIDI_ATTRIBUTE], undefined);
  });

  it('skips notes with no drawn notehead', () => {
    const instrument = {};
    const hidden = createNote({ fundamental: 0, octave: 1 });

    hidden.note.getNoteheadSVGs = () => [];

    assert.doesNotThrow(() => {
      tagScoreNoteheads({
        instruments: [instrument],
        measures: [[measureOf(instrument, [hidden.note])]],
        transposes: [{}],
      });
    });
  });
});
