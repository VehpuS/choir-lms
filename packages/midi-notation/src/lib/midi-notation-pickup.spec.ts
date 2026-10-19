import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { detectPickupSixteenths } from './midi-notation-pickup.ts';

const PPQ = 480;
const SIXTEENTH = PPQ / 4;
const BAR = 16;

type Note = { durationTicks: number; ticks: number };

/**
 * A four-part-style song: long notes on bar lines and the middle of the bar,
 * shorter ones between, with the bar lines `phase` 16ths after tick zero.
 */
const song = (phase: number, leadIn: boolean): Note[] => {
  const notes: Note[] = [];

  for (let bar = 0; bar < 12; bar += 1) {
    const start = phase + bar * BAR;

    notes.push(
      { durationTicks: 8 * SIXTEENTH, ticks: start * SIXTEENTH },
      { durationTicks: 4 * SIXTEENTH, ticks: (start + 8) * SIXTEENTH },
      { durationTicks: 2 * SIXTEENTH, ticks: (start + 12) * SIXTEENTH },
      { durationTicks: 2 * SIXTEENTH, ticks: (start + 14) * SIXTEENTH },
    );
  }

  // The pickup: a short note right before the first bar line.
  return leadIn && phase > 0
    ? [{ durationTicks: phase * SIXTEENTH, ticks: 0 }, ...notes]
    : notes;
};

describe('detectPickupSixteenths', () => {
  it('finds a pickup of each length from where the long notes land', () => {
    for (const phase of [2, 4, 8, 12, 14]) {
      assert.equal(
        detectPickupSixteenths(song(phase, true), PPQ, BAR),
        phase,
        `a pickup of ${phase} sixteenths`,
      );
    }
  });

  it('reports no pickup for a file that already starts on a bar line', () => {
    assert.equal(detectPickupSixteenths(song(0, false), PPQ, BAR), 0);
  });

  it('leaves leading silence alone: the first note must come before the first bar line', () => {
    // The phase is 4 but the music starts at the bar line, not before it.
    assert.equal(detectPickupSixteenths(song(4, false), PPQ, BAR), 0);
  });

  it('reports no pickup when no phase stands out', () => {
    const even: Note[] = Array.from({ length: 48 }, (_, index) => ({
      durationTicks: 4 * SIXTEENTH,
      ticks: index * 4 * SIXTEENTH,
    }));

    assert.equal(detectPickupSixteenths(even, PPQ, BAR), 0);
  });

  it('works in other time signatures', () => {
    // 3/4 is 12 sixteenths a bar: a bar-line note and a lighter second beat.
    const waltz: Note[] = [{ durationTicks: 4 * SIXTEENTH, ticks: 0 }];

    for (let bar = 0; bar < 10; bar += 1) {
      waltz.push(
        { durationTicks: 8 * SIXTEENTH, ticks: (4 + bar * 12) * SIXTEENTH },
        { durationTicks: 4 * SIXTEENTH, ticks: (12 + bar * 12) * SIXTEENTH },
      );
    }

    assert.equal(detectPickupSixteenths(waltz, PPQ, 12), 4);
  });

  it('reports no pickup for no notes, a handful of notes, or under three bars', () => {
    assert.equal(detectPickupSixteenths([], PPQ, BAR), 0);
    // The first bar and a half of a pickup song: too few notes to judge.
    assert.equal(
      detectPickupSixteenths(song(4, true).slice(0, 6), PPQ, BAR),
      0,
    );
    // Plenty of notes but all within two bars.
    const crowded: Note[] = Array.from({ length: 16 }, (_, index) => ({
      durationTicks: 2 * SIXTEENTH,
      ticks: index * 2 * SIXTEENTH,
    }));

    assert.equal(detectPickupSixteenths(crowded, PPQ, BAR), 0);
  });
});
