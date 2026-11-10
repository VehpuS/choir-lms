import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { analyzeAudioQuality, centsBetween } from './audio-quality';

const SAMPLE_RATE = 44_100;

const sine = (hz: number, seconds: number, amplitude = 0.5): Float32Array =>
  Float32Array.from(
    { length: Math.round(seconds * SAMPLE_RATE) },
    (_, index) =>
      Math.sin((2 * Math.PI * hz * index) / SAMPLE_RATE) * amplitude,
  );

describe('analyzeAudioQuality', () => {
  it('finds a clean tone clean: right pitch, no clicks, dropouts or clipping', () => {
    const report = analyzeAudioQuality(sine(330, 1), SAMPLE_RATE);

    assert.equal(report.clicks, 0);
    assert.equal(report.clippedSamples, 0);
    assert.equal(report.longestDropoutMs, 0);
    assert.ok(report.pitchHz !== null);
    assert.ok(Math.abs(centsBetween(report.pitchHz, 330)) < 5);
  });

  it('reports the loudness of the sounding part in dBFS', () => {
    const report = analyzeAudioQuality(sine(330, 1, 0.5), SAMPLE_RATE);

    // RMS of a 0.5 sine is 0.354, about -9 dBFS.
    assert.ok(Math.abs(report.loudnessDb - -9) < 0.5);
  });

  it('detects a click where the waveform jumps', () => {
    const samples = sine(330, 1);

    for (let index = 22_000; index < 22_010; index += 1) {
      samples[index] += 0.4;
    }

    assert.ok(analyzeAudioQuality(samples, SAMPLE_RATE).clicks >= 1);
  });

  it('detects a dropout inside the sounding part and measures its length', () => {
    const samples = sine(330, 1);

    samples.fill(0, 20_000, 20_000 + Math.round(0.02 * SAMPLE_RATE));

    const { longestDropoutMs } = analyzeAudioQuality(samples, SAMPLE_RATE);

    assert.ok(longestDropoutMs >= 18 && longestDropoutMs <= 22);
  });

  it('ignores silence before and after the sound', () => {
    const samples = new Float32Array(SAMPLE_RATE * 3);

    samples.set(sine(330, 1), SAMPLE_RATE);

    assert.equal(analyzeAudioQuality(samples, SAMPLE_RATE).longestDropoutMs, 0);
  });

  it('counts clipped samples', () => {
    const samples = sine(330, 1, 1.5).map((sample) =>
      Math.max(-1, Math.min(1, sample)),
    );

    assert.ok(analyzeAudioQuality(samples, SAMPLE_RATE).clippedSamples > 100);
  });

  it('reads a shifted pitch as the matching number of cents', () => {
    const report = analyzeAudioQuality(
      sine(330 * 2 ** (50 / 1200), 1),
      SAMPLE_RATE,
    );

    assert.ok(report.pitchHz !== null);
    assert.ok(Math.abs(centsBetween(report.pitchHz, 330) - 50) < 5);
  });

  it('reports silence as silence', () => {
    const report = analyzeAudioQuality(
      new Float32Array(SAMPLE_RATE),
      SAMPLE_RATE,
    );

    assert.equal(report.pitchHz, null);
    assert.equal(report.peak, 0);
  });
});
