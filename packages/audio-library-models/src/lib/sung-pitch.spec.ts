import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { midiToFrequency } from './piano-pitch.js';
import {
  centsZone,
  frequencyToSungPitch,
  matchSungNote,
} from './sung-pitch.js';

const A4 = 69;
const A3 = 57;

describe('frequencyToSungPitch', () => {
  it('maps concert A to A4 with no offset', () => {
    const pitch = frequencyToSungPitch(440);

    assert.equal(pitch?.midi, A4);
    assert.ok(Math.abs(pitch?.cents ?? 1) < 1e-9);
  });

  it('reports a flat note as a negative offset from its nearest note', () => {
    const pitch = frequencyToSungPitch(midiToFrequency(A3) * 2 ** (-10 / 1200));

    assert.equal(pitch?.midi, A3);
    assert.ok(Math.abs((pitch?.cents ?? 0) + 10) < 1e-6);
  });

  it('rounds a pitch past halfway to the next note', () => {
    const pitch = frequencyToSungPitch(440 * 2 ** (60 / 1200));

    assert.equal(pitch?.midi, A4 + 1);
    assert.ok(Math.abs((pitch?.cents ?? 0) + 40) < 1e-6);
  });

  it('follows the reference tuning', () => {
    const pitch = frequencyToSungPitch(442, 442);

    assert.equal(pitch?.midi, A4);
    assert.ok(Math.abs(pitch?.cents ?? 1) < 1e-9);
    // The same 442 Hz is about 8 cents sharp against A = 440.
    assert.ok(Math.abs((frequencyToSungPitch(442)?.cents ?? 0) - 7.85) < 0.01);
  });

  it('returns null for frequencies that are not positive', () => {
    assert.equal(frequencyToSungPitch(0), null);
    assert.equal(frequencyToSungPitch(-5), null);
    assert.equal(frequencyToSungPitch(Number.NaN), null);
    assert.equal(frequencyToSungPitch(440, 0), null);
  });

  it('round-trips through midiToFrequency with a custom reference', () => {
    const pitch = frequencyToSungPitch(midiToFrequency(60, 432), 432);

    assert.equal(pitch?.midi, 60);
    assert.ok(Math.abs(pitch?.cents ?? 1) < 1e-6);
  });
});

describe('matchSungNote', () => {
  const match = (sungMidi: number, sungCents: number, targetMidi: number) =>
    matchSungNote({ sungMidi, sungCents, targetMidi });

  it('matches the same pitch exactly', () => {
    assert.equal(match(A4, 0, A4), 'exact');
  });

  it('includes the 50 cent boundary and excludes beyond it', () => {
    assert.equal(match(A4, 50, A4), 'exact');
    assert.equal(match(A4, -50, A4), 'exact');
    assert.equal(match(A4, 60, A4), null);
  });

  it('matches a neighbouring note that is within the tolerance of the target', () => {
    // 40 cents below B4 is 60 cents above A♯4, so against A♯4 it is no match
    // but against B4 it is exact.
    assert.equal(match(A4 + 2, -40, A4 + 2), 'exact');
    assert.equal(match(A4 + 2, -40, A4 + 1), null);
  });

  it('reports the same note in another octave', () => {
    assert.equal(match(A3, 0, A4), 'other-octave');
    assert.equal(match(A4 + 12, 20, A4), 'other-octave');
    assert.equal(match(A4 - 24, -50, A4), 'other-octave');
  });

  it('does not report other-octave beyond the tolerance', () => {
    assert.equal(match(A3, 60, A4), null);
  });

  it('does not match a different note in any octave', () => {
    assert.equal(match(A4 + 2, 0, A4), null);
    assert.equal(match(A3 + 2, 0, A4), null);
  });

  it('honours a custom tolerance', () => {
    assert.equal(
      matchSungNote({
        sungMidi: A4,
        sungCents: 30,
        targetMidi: A4,
        toleranceCents: 25,
      }),
      null,
    );
  });
});

describe('centsZone', () => {
  it('names each band at and just past its boundary', () => {
    assert.equal(centsZone(0), 'precise');
    assert.equal(centsZone(10), 'precise');
    assert.equal(centsZone(10.1), 'near');
    assert.equal(centsZone(25), 'near');
    assert.equal(centsZone(25.1), 'quarter-tone-off');
    assert.equal(centsZone(50), 'quarter-tone-off');
    assert.equal(centsZone(50.1), 'off-pitch');
  });

  it('ignores the sign', () => {
    assert.equal(centsZone(-8), 'precise');
    assert.equal(centsZone(-40), 'quarter-tone-off');
    assert.equal(centsZone(-200), 'off-pitch');
  });
});
