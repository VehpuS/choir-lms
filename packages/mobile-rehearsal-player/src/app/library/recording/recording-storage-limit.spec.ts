import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  RECORDING_STORAGE_RESERVE_BYTES,
  bytesPerSecond,
  canStartRecording,
  formatTimeLeft,
  readRecordingTimeLeft,
  resolveRecordingTimeLeft,
} from './recording-storage-limit.js';

const SAMPLE_RATE = 44100;
const MINUTE_BYTES = bytesPerSecond(SAMPLE_RATE) * 60;

/** A reading that leaves exactly `minutes` of recording time after the reserve. */
const readingWithMinutes = (minutes: number) => ({
  quota: 10_000_000_000,
  usage:
    10_000_000_000 - RECORDING_STORAGE_RESERVE_BYTES - minutes * MINUTE_BYTES,
});

describe('resolveRecordingTimeLeft', () => {
  it('turns free space beyond the reserve into time at the recording byte rate', () => {
    const left = resolveRecordingTimeLeft(readingWithMinutes(80), SAMPLE_RATE);

    assert.ok(left.state === 'ok');
    assert.ok(Math.abs(left.timeLeftMs - 80 * 60_000) < 1000);
  });

  it('warns under five minutes and is full at or below the reserve', () => {
    assert.equal(
      resolveRecordingTimeLeft(readingWithMinutes(4), SAMPLE_RATE).state,
      'warning',
    );
    assert.equal(
      resolveRecordingTimeLeft(readingWithMinutes(5.5), SAMPLE_RATE).state,
      'ok',
    );
    assert.deepEqual(
      resolveRecordingTimeLeft(
        { quota: 100_000_000, usage: 99_000_000 },
        SAMPLE_RATE,
      ),
      { state: 'full', timeLeftMs: 0 },
    );
  });

  it('is unknown without a usable estimate', () => {
    assert.deepEqual(resolveRecordingTimeLeft(null, SAMPLE_RATE), {
      state: 'unknown',
    });
    assert.deepEqual(resolveRecordingTimeLeft({ quota: 5 }, SAMPLE_RATE), {
      state: 'unknown',
    });
  });
});

describe('readRecordingTimeLeft', () => {
  it('treats an estimate that throws as unknown', async () => {
    const left = await readRecordingTimeLeft(async () => {
      throw new Error('blocked');
    }, SAMPLE_RATE);

    assert.deepEqual(left, { state: 'unknown' });
  });
});

describe('canStartRecording', () => {
  it('refuses under a minute left, but never blocks on an unknown estimate', () => {
    assert.equal(
      canStartRecording(
        resolveRecordingTimeLeft(readingWithMinutes(0.5), SAMPLE_RATE),
      ),
      false,
    );
    assert.equal(
      canStartRecording(
        resolveRecordingTimeLeft(readingWithMinutes(2), SAMPLE_RATE),
      ),
      true,
    );
    assert.equal(canStartRecording({ state: 'unknown' }), true);
  });
});

describe('formatTimeLeft', () => {
  it('words the time as an estimate in hours and minutes', () => {
    assert.equal(formatTimeLeft(80 * 60_000), 'About 1 h 20 min left');
    assert.equal(formatTimeLeft(12 * 60_000), 'About 12 min left');
    assert.equal(formatTimeLeft(2 * 60 * 60_000), 'About 2 h left');
    assert.equal(formatTimeLeft(30_000), 'Less than a minute left');
  });
});
