/** Test helpers for the MIDI notation specs: build a MIDI file, read MusicXML back. */
import { createRequire } from 'node:module';

import type { Midi as MidiClass } from '@tonejs/midi';

// The writer is only needed to build fixtures; Node loads the CommonJS build
// through `require` (see tone-midi.ts).
const { Midi } = createRequire(import.meta.url)('@tonejs/midi') as {
  Midi: typeof MidiClass;
};

export const PPQ = 480;
export const SIXTEENTH_TICKS = PPQ / 4;
/** One twelfth of a quarter note: the notation grid unit. */
export const UNIT_TICKS = PPQ / 12;

export type FixtureNote = {
  durationTicks: number;
  midi: number;
  ticks: number;
};

export type FixtureTrack = {
  channel?: number;
  name?: string;
  notes: readonly FixtureNote[];
  program?: number;
};

/** A note given in grid units (twelfths of a quarter: a 16th is 3, a triplet eighth 4). */
export const units = (
  midi: number,
  start: number,
  length: number,
): FixtureNote => ({
  durationTicks: length * UNIT_TICKS,
  midi,
  ticks: start * UNIT_TICKS,
});

/** A note given in 16ths, as most specs think in the grid. */
export const sixteenths = (
  midi: number,
  start: number,
  length: number,
): FixtureNote => ({
  durationTicks: length * SIXTEENTH_TICKS,
  midi,
  ticks: start * SIXTEENTH_TICKS,
});

const MIDI_HEADER_BYTES = 14;
const TRACK_HEADER_BYTES = 8;

/**
 * Inserts a key signature meta event at the start of the first track by hand.
 * `@tonejs/midi` writes key signatures with the wrong sign (it adds 7 to the
 * key index where its reader subtracts it), so a signature written through the
 * library cannot be read back.
 */
const withKeySignature = (
  bytes: Uint8Array,
  key: { fifths: number; isMinor?: boolean },
): Uint8Array => {
  const event = [
    0x00,
    0xff,
    0x59,
    0x02,
    key.fifths & 0xff,
    key.isMinor ? 1 : 0,
  ];
  const lengthAt = MIDI_HEADER_BYTES + 4;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const patched = new Uint8Array(bytes.length + event.length);
  const insertAt = MIDI_HEADER_BYTES + TRACK_HEADER_BYTES;

  patched.set(bytes.subarray(0, insertAt));
  patched.set(event, insertAt);
  patched.set(bytes.subarray(insertAt), insertAt + event.length);
  new DataView(patched.buffer).setUint32(
    lengthAt,
    view.getUint32(lengthAt) + event.length,
  );

  return patched;
};

export const buildMidiFile = (options: {
  /** A key signature: sharps (positive) or flats (negative), and whether it is minor. */
  key?: { fifths: number; isMinor?: boolean };
  timeSignature?: [number, number];
  tracks: readonly FixtureTrack[];
}): Uint8Array => {
  const midi = new Midi();

  midi.header.setTempo(100);
  midi.header.timeSignatures.push({
    ticks: 0,
    timeSignature: options.timeSignature ?? [4, 4],
  });

  for (const spec of options.tracks) {
    const track = midi.addTrack();

    track.name = spec.name ?? '';
    track.channel = spec.channel ?? 0;
    track.instrument.number = spec.program ?? 0;
    spec.notes.forEach((note) => track.addNote({ ...note }));
  }

  const bytes = midi.toArray();

  return options.key ? withKeySignature(bytes, options.key) : bytes;
};

export type ReadNote = {
  alter: number;
  duration: number;
  isChord: boolean;
  isRest: boolean;
  isTuplet: boolean;
  octave: number | undefined;
  step: string | undefined;
  tieStart: boolean;
  tieStop: boolean;
  tupletStart: boolean;
  tupletStop: boolean;
  type: string;
  voice: number;
};

export type ReadMeasure = { notes: ReadNote[]; number: number };

const NOTE_PATTERN = /<note>([\s\S]*?)<\/note>/g;
const MEASURE_PATTERN = /<measure number="(\d+)">([\s\S]*?)<\/measure>/g;
const PART_PATTERN = /<part id="([^"]+)">([\s\S]*?)<\/part>/g;

const tag = (xml: string, name: string) =>
  new RegExp(`<${name}>([^<]*)</${name}>`).exec(xml)?.[1];

const readNote = (xml: string): ReadNote => ({
  alter: Number(tag(xml, 'alter') ?? 0),
  duration: Number(tag(xml, 'duration')),
  isChord: xml.includes('<chord/>'),
  isRest: xml.includes('<rest/>'),
  isTuplet: xml.includes('<time-modification>'),
  octave:
    tag(xml, 'octave') === undefined ? undefined : Number(tag(xml, 'octave')),
  step: tag(xml, 'step'),
  tieStart: xml.includes('<tie type="start"/>'),
  tieStop: xml.includes('<tie type="stop"/>'),
  tupletStart: xml.includes('<tuplet type="start"'),
  tupletStop: xml.includes('<tuplet type="stop"'),
  type: tag(xml, 'type') ?? '',
  voice: Number(tag(xml, 'voice')),
});

/** Reads every part's measures and notes from the converter's MusicXML. */
export const readParts = (musicXml: string): Record<string, ReadMeasure[]> => {
  const parts: Record<string, ReadMeasure[]> = {};

  for (const [, id = '', body = ''] of musicXml.matchAll(PART_PATTERN)) {
    parts[id] = [...body.matchAll(MEASURE_PATTERN)].map(
      ([, number, measure = '']) => ({
        notes: [...measure.matchAll(NOTE_PATTERN)].map(([, note = '']) =>
          readNote(note),
        ),
        number: Number(number),
      }),
    );
  }

  return parts;
};

/** Total length of each voice in a measure, ignoring chord mates, by voice number. */
export const voiceLengths = (measure: ReadMeasure): Record<number, number> => {
  const lengths: Record<number, number> = {};

  for (const note of measure.notes) {
    if (!note.isChord) {
      lengths[note.voice] = (lengths[note.voice] ?? 0) + note.duration;
    }
  }

  return lengths;
};

/** A measure the spec expects to exist; fails the spec with a clear message when it does not. */
export const requireMeasure = (
  measure: ReadMeasure | undefined,
): ReadMeasure => {
  if (!measure) {
    throw new Error('expected a measure');
  }

  return measure;
};

/**
 * Where each sounding note begins within a measure, in grid units, skipping the
 * tied continuations of a note that began earlier. Chord mates share an onset.
 */
export const noteOnsets = (measure: ReadMeasure, voice = 1): number[] => {
  const onsets: number[] = [];
  let position = 0;

  for (const note of measure.notes.filter((entry) => entry.voice === voice)) {
    if (!note.isRest && !note.tieStop && !note.isChord) {
      onsets.push(position);
    }

    if (!note.isChord) {
      position += note.duration;
    }
  }

  return onsets;
};
