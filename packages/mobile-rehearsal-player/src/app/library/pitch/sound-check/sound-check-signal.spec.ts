import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildSoundCheckSignal,
  encodeSoundCheckWav,
  SOUND_CHECK_SECONDS,
} from './sound-check-signal';

const RATE = 8000;
const energy = (samples: Float32Array, fromSec: number, toSec: number) =>
  samples
    .slice(Math.round(fromSec * RATE), Math.round(toSec * RATE))
    .reduce((sum, value) => sum + value * value, 0);

describe('buildSoundCheckSignal', () => {
  const signal = buildSoundCheckSignal(RATE);

  it('is four seconds long on both channels, at a modest level', () => {
    assert.equal(signal.left.length, SOUND_CHECK_SECONDS * RATE);
    assert.equal(signal.right.length, signal.left.length);

    const peak = Math.max(
      ...signal.left.map(Math.abs),
      ...signal.right.map(Math.abs),
    );

    assert.ok(peak <= 0.3 + 1e-6 && peak > 0.29);
  });

  it('puts the first second on the left only and the second on the right only', () => {
    assert.ok(energy(signal.left, 0, 1) > 1);
    assert.equal(energy(signal.right, 0, 1), 0);
    assert.equal(energy(signal.left, 1, 2), 0);
    assert.ok(energy(signal.right, 1, 2) > 1);
  });

  it('plays the sweep on both channels, equally, and ends in silence', () => {
    assert.ok(energy(signal.left, 2, 3) > 1);
    assert.equal(energy(signal.left, 2, 3), energy(signal.right, 2, 3));
    assert.equal(energy(signal.left, 3, 4), 0);
    assert.equal(energy(signal.right, 3, 4), 0);
  });
});

describe('encodeSoundCheckWav', () => {
  it('is a stereo 16-bit WAV with a sample for each channel of each frame', () => {
    const signal = buildSoundCheckSignal(RATE);
    const bytes = encodeSoundCheckWav(signal);
    const view = new DataView(bytes.buffer);
    const frames = signal.left.length;

    assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'RIFF');
    assert.equal(view.getUint16(22, true), 2);
    assert.equal(view.getUint32(24, true), RATE);
    assert.equal(bytes.length, 44 + frames * 2 * 2);
  });

  it('interleaves left then right', () => {
    const bytes = encodeSoundCheckWav({
      left: Float32Array.of(0.5, 0),
      right: Float32Array.of(-0.5, 0),
      sampleRate: RATE,
    });
    const view = new DataView(bytes.buffer);

    assert.ok(view.getInt16(44, true) > 0);
    assert.ok(view.getInt16(46, true) < 0);
  });
});
