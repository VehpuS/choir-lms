import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { convertMidiToMusicXml } from './midi-to-musicxml.ts';
import {
  SIXTEENTH_TICKS,
  buildMidiFile,
  readParts,
  requireMeasure,
  sixteenths,
  voiceLengths,
  type FixtureNote,
} from './midi-notation-test-support.ts';
import { extractScoreParts } from '@org/audio-library-models';

const CHOIR_AAHS_ZERO_BASED = 52;

/** A four-bar line in 4/4 with quarter notes from `base` going up a step a beat. */
const line = (base: number, jitter = 0): FixtureNote[] =>
  Array.from({ length: 16 }, (_, beat) => ({
    durationTicks: SIXTEENTH_TICKS * 3.6, // played slightly short, as a singer would
    midi: base + (beat % 4) * 2,
    ticks: beat * SIXTEENTH_TICKS * 4 + (beat % 2 === 0 ? jitter : -jitter),
  }));

const satb = (jitter = 0) =>
  buildMidiFile({
    key: { fifths: 0 },
    tracks: [
      {
        name: 'Soprano',
        notes: line(72, jitter),
        program: CHOIR_AAHS_ZERO_BASED,
      },
      { name: 'Alto', notes: line(65, jitter), program: CHOIR_AAHS_ZERO_BASED },
      {
        name: 'Tenor',
        notes: line(55, jitter),
        program: CHOIR_AAHS_ZERO_BASED,
      },
      { name: 'Bass', notes: line(43, jitter), program: CHOIR_AAHS_ZERO_BASED },
    ],
  });

describe('convertMidiToMusicXml', () => {
  it('writes one part per track with names, program, and clefs a vocal filter can read', () => {
    const result = convertMidiToMusicXml(satb());

    assert.ok(result);
    assert.equal(result.partCount, 4);
    assert.deepEqual(
      extractScoreParts(result.musicXml).map(({ name, kind, midiProgram }) => [
        name,
        kind,
        midiProgram,
      ]),
      [
        ['Soprano', 'vocal', 53],
        ['Alto', 'vocal', 53],
        ['Tenor', 'vocal', 53],
        ['Bass', 'vocal', 53],
      ],
    );
    assert.match(result.musicXml, /<sign>F<\/sign><line>4<\/line>/);
    assert.match(
      result.musicXml,
      /<clef-octave-change>-1<\/clef-octave-change>/,
    );
  });

  it('keeps every voice exactly one bar long, even with timing jitter', () => {
    // About 20 ms of jitter at 100 bpm.
    const result = convertMidiToMusicXml(satb(SIXTEENTH_TICKS * 0.3));

    assert.ok(result);
    assert.equal(result.barCount, 4);

    for (const [, measures] of Object.entries(readParts(result.musicXml))) {
      assert.equal(measures.length, 4);

      for (const measure of measures) {
        for (const length of Object.values(voiceLengths(measure))) {
          assert.equal(length, 48);
        }
      }
    }
  });

  it('recovers pitches and onsets of a jittered performance exactly', () => {
    const result = convertMidiToMusicXml(satb(SIXTEENTH_TICKS * 0.3));
    const soprano = readParts(result?.musicXml ?? '').P1 ?? [];
    const pitched = soprano
      .flatMap(({ notes }) => notes)
      .filter(({ isRest }) => !isRest);

    assert.equal(pitched.length, 16);
    assert.deepEqual(
      pitched
        .slice(0, 4)
        .map(({ step, alter, octave }) => `${step}${alter}${octave}`),
      ['C05', 'D05', 'E05', 'F15'],
    );
    // The last note, played a little short, is closed up to the beat too.
    assert.ok(pitched.every(({ duration }) => duration === 12));
  });

  it('uses the key in the file and says so, else infers one', () => {
    const notes = [62, 64, 66, 67, 69, 71, 73, 74].map((midi, index) =>
      sixteenths(midi, index * 2, 2),
    );
    const withKey = convertMidiToMusicXml(
      buildMidiFile({ key: { fifths: 1 }, tracks: [{ notes }] }),
    );
    const inferred = convertMidiToMusicXml(
      buildMidiFile({ tracks: [{ notes }] }),
    );

    assert.equal(withKey?.keySource, 'file');
    assert.match(withKey?.musicXml ?? '', /<fifths>1<\/fifths>/);
    assert.equal(inferred?.keySource, 'inferred');
    assert.match(inferred?.musicXml ?? '', /<fifths>2<\/fifths>/);
  });

  it('writes the file time signature and bars of that length', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({
        timeSignature: [3, 4],
        tracks: [{ notes: [sixteenths(60, 0, 12), sixteenths(62, 12, 12)] }],
      }),
    );

    assert.match(
      result?.musicXml ?? '',
      /<beats>3<\/beats><beat-type>4<\/beat-type>/,
    );
    assert.equal(result?.barCount, 2);

    for (const measure of readParts(result?.musicXml ?? '').P1 ?? []) {
      assert.equal(voiceLengths(measure)[1], 36);
    }
  });

  it('ties a note held across a barline', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({ tracks: [{ notes: [sixteenths(60, 12, 8)] }] }),
    );
    const [first, second] = readParts(result?.musicXml ?? '').P1 ?? [];
    const held = (bar: typeof first) =>
      bar?.notes.filter(({ isRest }) => !isRest);

    assert.equal(held(first)?.[0]?.tieStart, true);
    assert.equal(held(second)?.[0]?.tieStop, true);
  });

  it('leaves room for a pickup measure when asked', () => {
    // A one-beat pickup, then a note on the first full bar.
    const notes = [sixteenths(60, 0, 4), sixteenths(62, 4, 16)];
    const without = convertMidiToMusicXml(
      buildMidiFile({ tracks: [{ notes }] }),
    );
    const withPickup = convertMidiToMusicXml(
      buildMidiFile({ tracks: [{ notes }] }),
      {
        pickupSixteenths: 4,
      },
    );
    const firstBar = (xml: string | undefined) =>
      readParts(xml ?? '').P1?.[0]?.notes.map(({ isRest, duration }) => [
        isRest,
        duration,
      ]);

    // Without the offset the second note straddles bars 1 and 2; with it the
    // pickup note ends the first bar and the long note starts the second.
    assert.deepEqual(firstBar(without?.musicXml), [
      [false, 12],
      [false, 36],
    ]);
    assert.deepEqual(firstBar(withPickup?.musicXml), [
      [true, 36],
      [false, 12],
    ]);
  });

  it('writes simultaneous notes as a chord, not as extra voices', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({
        tracks: [
          {
            notes: [
              sixteenths(60, 0, 16),
              sixteenths(64, 0, 16),
              sixteenths(67, 0, 16),
            ],
          },
        ],
      }),
    );
    const bar = readParts(result?.musicXml ?? '').P1?.[0];

    assert.deepEqual(Object.keys(voiceLengths(requireMeasure(bar))), ['1']);
    assert.deepEqual(
      bar?.notes.map(({ isChord }) => isChord),
      [false, true, true],
    );
  });

  it('skips percussion and tracks without notes', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({
        tracks: [
          { channel: 9, name: 'Drums', notes: [sixteenths(36, 0, 4)] },
          { name: 'Alto', notes: [sixteenths(65, 0, 16)] },
          { name: 'Empty', notes: [] },
        ],
      }),
    );

    assert.equal(result?.partCount, 1);
    assert.deepEqual(
      extractScoreParts(result?.musicXml ?? '').map(({ name }) => name),
      ['Alto'],
    );
  });

  it('numbers unnamed tracks like the part list does and escapes names', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({
        tracks: [
          { notes: [sixteenths(60, 0, 16)] },
          { name: 'Alto <I> & "II"', notes: [sixteenths(65, 0, 16)] },
        ],
      }),
      { title: 'Kyrie & Gloria' },
    );
    const names = extractScoreParts(result?.musicXml ?? '').map(
      ({ name }) => name,
    );

    assert.deepEqual(names, ['Track 1', 'Alto <I> & "II"']);
    assert.match(
      result?.musicXml ?? '',
      /<work-title>Kyrie &amp; Gloria<\/work-title>/,
    );
  });

  it('returns nothing for bytes that are not MIDI, files without notes, and huge scores', () => {
    assert.equal(convertMidiToMusicXml(new Uint8Array()), undefined);
    assert.equal(
      convertMidiToMusicXml(new TextEncoder().encode('<score-partwise/>')),
      undefined,
    );
    assert.equal(
      convertMidiToMusicXml(buildMidiFile({ tracks: [{ notes: [] }] })),
      undefined,
    );
    assert.equal(
      convertMidiToMusicXml(
        buildMidiFile({ tracks: [{ notes: [sixteenths(60, 16 * 600, 4)] }] }),
      ),
      undefined,
    );
  });
});
