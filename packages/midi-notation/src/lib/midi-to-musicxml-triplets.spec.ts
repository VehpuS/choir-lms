import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { convertMidiToMusicXml } from './midi-to-musicxml.ts';
import {
  UNIT_TICKS,
  buildMidiFile,
  noteOnsets,
  readParts,
  requireMeasure,
  units,
  voiceLengths,
  type FixtureNote,
} from './midi-notation-test-support.ts';

describe('convertMidiToMusicXml with triplets', () => {
  const tripletLine = (jitter: number): FixtureNote[] => {
    // Bar 1: twelve eighth-note triplets. Bar 2: four straight quarters.
    const jitterAt = (index: number) => (index % 2 === 0 ? jitter : -jitter);
    const triplets = Array.from({ length: 12 }, (_, index) => ({
      durationTicks: UNIT_TICKS * 3.6,
      midi: 67 + (index % 3) * 2,
      ticks: Math.max(0, index * UNIT_TICKS * 4 + jitterAt(index)),
    }));
    const quarters = Array.from({ length: 4 }, (_, index) => ({
      durationTicks: UNIT_TICKS * 11,
      midi: 72,
      ticks: UNIT_TICKS * 48 + index * UNIT_TICKS * 12 + jitterAt(index),
    }));

    return [...triplets, ...quarters];
  };

  it('writes jittered eighth-note triplets as bracketed triplets and the rest straight', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({ tracks: [{ notes: tripletLine(UNIT_TICKS * 0.25) }] }),
    );
    const [first, second] = readParts(result?.musicXml ?? '').P1 ?? [];
    const triplets = (first?.notes ?? []).filter(({ isRest }) => !isRest);

    assert.match(result?.musicXml ?? '', /<divisions>12<\/divisions>/);
    assert.equal(triplets.length, 12);
    assert.ok(
      triplets.every(({ duration, isTuplet }) => duration === 4 && isTuplet),
    );
    assert.equal(triplets.filter(({ tupletStart }) => tupletStart).length, 4);
    assert.equal(triplets.filter(({ tupletStop }) => tupletStop).length, 4);
    assert.ok((second?.notes ?? []).every(({ isTuplet }) => !isTuplet));
    assert.equal(voiceLengths(requireMeasure(first))[1], 48);
    assert.equal(voiceLengths(requireMeasure(second))[1], 48);
  });

  it('does not find triplets in a straight, loosely played part', () => {
    // Four bars of quarters and eighths, each note up to 30 ms off the beat.
    const plan = [0, 12, 18, 24, 36, 48, 60, 66, 72, 84, 96, 108, 114, 120];
    const notes = plan.map((start, index) => ({
      durationTicks: UNIT_TICKS * 5.5,
      midi: 60 + (index % 5),
      ticks: Math.max(0, start * UNIT_TICKS + (index % 2 === 0 ? 14 : -14)),
    }));
    const result = convertMidiToMusicXml(
      buildMidiFile({ tracks: [{ notes }] }),
    );

    assert.ok(result);
    assert.doesNotMatch(result.musicXml, /time-modification/);
  });

  it('keeps quarter-note triplets over two beats on the right onsets', () => {
    // Three notes in the time of two beats, then a straight half note.
    const result = convertMidiToMusicXml(
      buildMidiFile({
        tracks: [
          {
            notes: [
              units(72, 0, 8),
              units(74, 8, 8),
              units(76, 16, 8),
              units(77, 24, 24),
            ],
          },
        ],
      }),
    );
    const [bar] = readParts(result?.musicXml ?? '').P1 ?? [];

    assert.match(result?.musicXml ?? '', /time-modification/);
    assert.deepEqual(noteOnsets(requireMeasure(bar)), [0, 8, 16, 24]);
    assert.equal(voiceLengths(requireMeasure(bar))[1], 48);
  });

  it('keeps every voice exactly one bar long when triplets and chords mix', () => {
    const result = convertMidiToMusicXml(
      buildMidiFile({
        tracks: [
          { name: 'Soprano', notes: tripletLine(UNIT_TICKS * 0.25) },
          {
            name: 'Bass',
            notes: [
              units(48, 0, 24),
              units(52, 0, 24),
              units(50, 24, 24),
              units(47, 48, 48),
            ],
          },
        ],
      }),
    );

    assert.ok(result);

    for (const measures of Object.values(readParts(result.musicXml))) {
      for (const measure of measures) {
        for (const length of Object.values(voiceLengths(measure))) {
          assert.equal(length, 48, `bar ${measure.number}`);
        }
      }
    }
  });
});
