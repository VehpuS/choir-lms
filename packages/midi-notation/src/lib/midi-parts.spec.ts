import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createRequire } from 'node:module';

import type { Midi as MidiClass } from '@tonejs/midi';

import { extractMidiParts } from './midi-parts.ts';

// The writer is only needed to build fixtures; Node loads the CommonJS build
// through `require` (see the note in midi-parts.ts).
const { Midi } = createRequire(import.meta.url)('@tonejs/midi') as {
  Midi: typeof MidiClass;
};

const CHOIR_AAHS_PROGRAM_ZERO_BASED = 52;
const PERCUSSION_CHANNEL_INDEX = 9;

type TrackSpec = {
  channel?: number;
  name?: string;
  notes?: number;
  program?: number;
};

// Builds a format 1 file whose first track is a notes-free conductor track,
// as score exporters write it.
const buildMidi = (tracks: readonly TrackSpec[]): Uint8Array => {
  const midi = new Midi();

  midi.header.setTempo(100);
  midi.addTrack();

  for (const spec of tracks) {
    const track = midi.addTrack();

    track.name = spec.name ?? '';
    track.channel = spec.channel ?? 0;
    track.instrument.number = spec.program ?? 0;

    for (let note = 0; note < (spec.notes ?? 1); note += 1) {
      track.addNote({ midi: 60 + note, time: note * 0.5, duration: 0.5 });
    }
  }

  return midi.toArray();
};

const summarize = (bytes: Uint8Array) =>
  extractMidiParts(bytes).map(({ id, name, kind }) => [id, name, kind]);

// A hand-assembled file, independent of the library that writes the others:
// a tempo-only track, then a track named "Alto" on program 53 with one note.
const chunk = (type: string, body: number[]): number[] => [
  ...[...type].map((character) => character.charCodeAt(0)),
  0,
  0,
  0,
  body.length,
  ...body,
];
const RAW_ALTO_FILE = Uint8Array.from([
  ...chunk('MThd', [0, 1, 0, 2, 1, 0xe0]),
  ...chunk('MTrk', [0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20, 0, 0xff, 0x2f, 0]),
  ...chunk('MTrk', [
    ...[0, 0xff, 0x03, 4, 0x41, 0x6c, 0x74, 0x6f],
    ...[0, 0xc0, CHOIR_AAHS_PROGRAM_ZERO_BASED],
    ...[0, 0x90, 60, 64],
    ...[0x83, 0x60, 0x80, 60, 0],
    ...[0, 0xff, 0x2f, 0],
  ]),
]);

describe('extractMidiParts', () => {
  it('lists the voice tracks of a SATB file and skips the conductor track', () => {
    const bytes = buildMidi(
      ['Soprano', 'Alto', 'Tenor', 'Bass'].map((name) => ({
        name,
        program: CHOIR_AAHS_PROGRAM_ZERO_BASED,
      })),
    );

    assert.deepEqual(summarize(bytes), [
      ['track-1', 'Soprano', 'vocal'],
      ['track-2', 'Alto', 'vocal'],
      ['track-3', 'Tenor', 'vocal'],
      ['track-4', 'Bass', 'vocal'],
    ]);
  });

  it('reports the part position, 1-based channel, and 1-based program', () => {
    const [first, second] = extractMidiParts(
      buildMidi([
        { name: 'Soprano', channel: 2, program: CHOIR_AAHS_PROGRAM_ZERO_BASED },
        { name: 'Alto', channel: 3 },
      ]),
    );

    assert.equal(first?.index, 0);
    assert.equal(first?.channel, 3);
    assert.equal(first?.midiProgram, 53);
    assert.equal(second?.index, 1);
    assert.equal(second?.channel, 4);
  });

  it('keeps a piano track instrumental next to a voice track', () => {
    assert.deepEqual(
      summarize(buildMidi([{ name: 'Voice' }, { name: 'Piano' }])),
      [
        ['track-1', 'Voice', 'vocal'],
        ['track-2', 'Piano', 'instrumental'],
      ],
    );
  });

  it('reads a part-only file as one part', () => {
    assert.deepEqual(summarize(buildMidi([{ name: 'Tenor II' }])), [
      ['track-1', 'Tenor II', 'vocal'],
    ]);
  });

  it('numbers an unnamed track and trusts only a choir or voice program', () => {
    assert.deepEqual(
      summarize(
        buildMidi([
          {},
          { program: CHOIR_AAHS_PROGRAM_ZERO_BASED },
          { program: 40 },
        ]),
      ),
      [
        ['track-1', 'Track 2', 'unknown'],
        ['track-2', 'Track 3', 'vocal'],
        ['track-3', 'Track 4', 'unknown'],
      ],
    );
  });

  it('treats the percussion channel as instrumental even when unnamed', () => {
    assert.deepEqual(
      summarize(buildMidi([{ channel: PERCUSSION_CHANNEL_INDEX }])),
      [['track-1', 'Track 2', 'instrumental']],
    );
  });

  it('keeps ids tied to the track position when a notes-free track sits between', () => {
    const midi = new Midi();

    for (const name of ['Soprano', '', 'Bass']) {
      const track = midi.addTrack();

      track.name = name;
      if (name !== '') {
        track.addNote({ midi: 60, time: 0, duration: 1 });
      }
    }

    assert.deepEqual(
      extractMidiParts(midi.toArray()).map(({ id, index }) => [id, index]),
      [
        ['track-0', 0],
        ['track-2', 1],
      ],
    );
  });

  // The parser drops a tempo-only first track, so Alto is track 0 here.
  it('reads a hand-assembled file', () => {
    const parts = extractMidiParts(RAW_ALTO_FILE);

    assert.deepEqual(
      parts.map(({ id, name, kind, midiProgram }) => [
        id,
        name,
        kind,
        midiProgram,
      ]),
      [['track-0', 'Alto', 'vocal', 53]],
    );
  });

  it('returns no parts for empty or non-MIDI bytes without throwing', () => {
    assert.deepEqual(extractMidiParts(new Uint8Array()), []);
    assert.deepEqual(
      extractMidiParts(new TextEncoder().encode('<score-partwise/>')),
      [],
    );
    assert.deepEqual(extractMidiParts(RAW_ALTO_FILE.slice(0, 10)), []);
  });

  it('names a track from an empty named track just before it', () => {
    // Exporters such as the audited V7 file write a part's name in an empty
    // track and its notes in the next one.
    const midi = new Midi();

    midi.header.setTempo(100);
    midi.addTrack();

    for (const name of ['Alto', 'Tenor']) {
      const label = midi.addTrack();

      label.name = name;

      const notes = midi.addTrack();

      notes.channel = 1;
      notes.addNote({ midi: 60, time: 0, duration: 0.5 });
    }

    const unnamed = midi.addTrack();

    unnamed.addNote({ midi: 62, time: 0, duration: 0.5 });

    assert.deepEqual(summarize(midi.toArray()), [
      ['track-2', 'Alto', 'vocal'],
      ['track-4', 'Tenor', 'vocal'],
      ['track-5', 'Track 6', 'unknown'],
    ]);
  });

  it("keeps a track's own name over the name of the empty track before it", () => {
    const midi = new Midi();

    midi.header.setTempo(100);
    midi.addTrack().name = 'Soprano';

    const own = midi.addTrack();

    own.name = 'Alto';
    own.addNote({ midi: 60, time: 0, duration: 0.5 });

    assert.deepEqual(summarize(midi.toArray()), [['track-1', 'Alto', 'vocal']]);
  });
});
