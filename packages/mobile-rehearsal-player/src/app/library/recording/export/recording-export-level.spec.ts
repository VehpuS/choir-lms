import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { WAV_HEADER_BYTES } from '@org/audio-mixing';

import {
  plan,
  recordingFor,
  run,
  setUp,
} from './recording-export-test-helpers';

const INT16_MAX = 32_767;

/** The loudest sample of a downloaded WAV, as a fraction of full scale. */
const peakOf = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer()).slice(
    WAV_HEADER_BYTES,
  );
  const samples = new Int16Array(bytes.buffer);

  return (
    samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0) /
    INT16_MAX
  );
};

/** The test track holds 0.2 and the stored recording 0.1, so a mix is 0.2 plus 0.1 times the level. */
const mixPeak = async (levelDb: number | undefined, saved?: number) => {
  const { deps, saved: files } = setUp();
  const recording = {
    ...recordingFor('a'),
    ...(saved === undefined ? {} : { levelDb: saved }),
  };

  await run(
    plan({
      destination: 'download',
      items: [{ fileName: 'a.wav', recording }],
      kind: 'mix',
      levelDb,
    }),
    deps,
  );

  return peakOf(files[0]?.blob as Blob);
};

describe('exporting a mix with a level', () => {
  it('mixes the recording as recorded when the level is 0 dB', async () => {
    assert.ok(Math.abs((await mixPeak(0)) - 0.3) < 2e-3);
  });

  it('raises only the recording by the level', async () => {
    // 0.2 + 0.1 * 3.98 (12 dB) is about 0.6, still below the limiter.
    assert.ok(Math.abs((await mixPeak(12)) - 0.598) < 5e-3);
  });

  it('uses the recording’s own saved level when the plan has none', async () => {
    assert.ok(Math.abs((await mixPeak(undefined, 12)) - 0.598) < 5e-3);
  });

  it('does not clip a boosted recording over a loud track', async () => {
    // 0.2 + 0.1 * 7.94 (18 dB) would be about 0.99 before limiting.
    const peak = await mixPeak(18);

    assert.ok(peak > 0.8 && peak < 0.95, `peak ${peak}`);
  });

  it('leaves Export recording only as it was recorded, whatever the level', async () => {
    const { deps, saved } = setUp();

    await run(
      plan({ destination: 'download', kind: 'recording', levelDb: 18 }),
      deps,
    );

    assert.ok(Math.abs((await peakOf(saved[0]?.blob as Blob)) - 0.1) < 2e-3);
  });
});
