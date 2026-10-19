import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { convertMidiToMusicXml } from './midi-to-musicxml.ts';
import {
  buildMidiFile,
  readParts,
  requireMeasure,
  sixteenths,
} from './midi-notation-test-support.ts';

const PPQ = 480;
const BAR_44_TICKS = 4 * PPQ;

/** The XML of one measure of the first part. */
const measureXml = (xml: string | undefined, number: number): string => {
  return (
    new RegExp(`<measure number="${number}">([\\s\\S]*?)</measure>`).exec(
      xml ?? '',
    )?.[1] ?? ''
  );
};

const durations = (xml: string | undefined, number: number) =>
  readParts(xml ?? '').P1?.[number - 1]?.notes.map(({ duration, isRest }) => [
    isRest,
    duration,
  ]);

describe('convertMidiToMusicXml with time signature changes', () => {
  it('follows a change from 4/4 to 3/4, so every bar line stays on the music', () => {
    // Two whole-note bars of 4/4, then three dotted-half bars of 3/4.
    const notes = [
      sixteenths(60, 0, 16),
      sixteenths(60, 16, 16),
      sixteenths(62, 32, 12),
      sixteenths(62, 44, 12),
      sixteenths(62, 56, 12),
    ];
    const result = convertMidiToMusicXml(
      buildMidiFile({
        timeSignatureChanges: [
          { ticks: 2 * BAR_44_TICKS, timeSignature: [3, 4] },
        ],
        tracks: [{ notes }],
      }),
    );

    assert.equal(result?.barCount, 5);
    assert.match(measureXml(result?.musicXml, 1), /<beats>4<\/beats>/);
    assert.match(measureXml(result?.musicXml, 3), /<beats>3<\/beats>/);
    assert.doesNotMatch(measureXml(result?.musicXml, 2), /<time>/);
    assert.doesNotMatch(measureXml(result?.musicXml, 4), /<time>/);
    assert.deepEqual(durations(result?.musicXml, 2), [[false, 48]]);

    for (const bar of [3, 4, 5]) {
      assert.deepEqual(durations(result?.musicXml, bar), [[false, 36]]);
    }
  });

  it('follows a change of beat type, from 6/8 to 4/4', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({
        timeSignature: [6, 8],
        timeSignatureChanges: [{ ticks: 12 * 120, timeSignature: [4, 4] }],
        tracks: [
          {
            notes: [
              sixteenths(60, 0, 6),
              sixteenths(62, 6, 6),
              sixteenths(64, 12, 16),
              sixteenths(65, 28, 16),
            ],
          },
        ],
      }),
      { pickupSixteenths: 0 },
    );

    assert.equal(result?.barCount, 3);
    assert.match(measureXml(result?.musicXml, 1), /<beats>6<\/beats>/);
    assert.match(measureXml(result?.musicXml, 2), /<beats>4<\/beats>/);
    assert.deepEqual(durations(result?.musicXml, 1), [
      [false, 18],
      [false, 18],
    ]);
    assert.deepEqual(durations(result?.musicXml, 2), [[false, 48]]);
  });

  it('reads a one-beat first bar written as a 1/4 time signature before 4/4 (a pickup)', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({
        timeSignature: [1, 4],
        timeSignatureChanges: [{ ticks: PPQ, timeSignature: [4, 4] }],
        tracks: [
          {
            notes: [
              sixteenths(60, 0, 4),
              sixteenths(62, 4, 16),
              sixteenths(64, 20, 16),
            ],
          },
        ],
      }),
    );

    assert.deepEqual(durations(result?.musicXml, 1), [[false, 12]]);
    assert.match(measureXml(result?.musicXml, 1), /<beats>1<\/beats>/);
    assert.match(measureXml(result?.musicXml, 2), /<beats>4<\/beats>/);
    assert.deepEqual(durations(result?.musicXml, 2), [[false, 48]]);
    assert.equal(result?.pickupSixteenths, 0);
  });

  it('does not guess a pickup in a file whose time signature changes', () => {
    // The same notes would read as a pickup of 4 sixteenths in 4/4 alone.
    const notes = [sixteenths(60, 0, 4)];

    for (let bar = 0; bar < 6; bar += 1) {
      notes.push(
        sixteenths(62, 4 + bar * 16, 8),
        sixteenths(64, 12 + bar * 16, 4),
      );
    }

    const result = convertMidiToMusicXml(
      buildMidiFile({
        timeSignatureChanges: [{ ticks: 80 * 120, timeSignature: [3, 4] }],
        tracks: [{ notes }],
      }),
    );

    assert.equal(result?.pickupSixteenths, 0);
  });

  it('keeps a single time signature exactly as before', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({
        tracks: [{ notes: [sixteenths(60, 0, 16), sixteenths(62, 16, 16)] }],
      }),
    );

    assert.equal(result?.barCount, 2);
    assert.equal(
      (result?.musicXml.match(/<time>/g) ?? []).length,
      1,
      'one time signature, in the first measure',
    );
    assert.ok(requireMeasure(readParts(result?.musicXml ?? '').P1?.[0]));
  });
});

describe('convertMidiToMusicXml with key signature changes', () => {
  // A whole note on the black key between A and B, one per bar.
  const blackKey = Array.from({ length: 4 }, (_, bar) =>
    sixteenths(70, bar * 16, 16),
  );

  it('writes a key change at its bar and spells black keys from the key in force', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({
        keyChanges: [
          { fifths: 3, ticks: 0 },
          { fifths: -1, ticks: 2 * BAR_44_TICKS },
        ],
        tracks: [{ notes: blackKey }],
      }),
    );

    assert.equal(result?.keySource, 'file');
    assert.match(measureXml(result?.musicXml, 1), /<fifths>3<\/fifths>/);
    assert.doesNotMatch(measureXml(result?.musicXml, 2), /<key>/);
    assert.match(measureXml(result?.musicXml, 3), /<fifths>-1<\/fifths>/);
    assert.doesNotMatch(measureXml(result?.musicXml, 4), /<key>/);
    // In a sharp key the pitch is A sharp; once the key has flats it is B flat.
    assert.match(
      measureXml(result?.musicXml, 2),
      /<step>A<\/step><alter>1<\/alter>/,
    );
    assert.match(
      measureXml(result?.musicXml, 4),
      /<step>B<\/step><alter>-1<\/alter>/,
    );
  });

  it('takes a key change that falls inside a bar from the next bar', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({
        keyChanges: [
          { fifths: 3, ticks: 0 },
          { fifths: -1, ticks: BAR_44_TICKS + 2 * PPQ },
        ],
        tracks: [{ notes: blackKey }],
      }),
    );

    assert.doesNotMatch(measureXml(result?.musicXml, 2), /<key>/);
    assert.match(measureXml(result?.musicXml, 3), /<fifths>-1<\/fifths>/);
  });

  it('writes no key change when the key never changes', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({
        keyChanges: [
          { fifths: 2, ticks: 0 },
          { fifths: 2, ticks: BAR_44_TICKS },
        ],
        tracks: [{ notes: blackKey }],
      }),
    );

    assert.equal((result?.musicXml.match(/<key>/g) ?? []).length, 1);
  });
});
