import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isSavedTrackDownloadAbortError } from '../../playback/utils/saved-track-blob-download';
import { createPreparedStemStore } from '../prepared/prepared-stem-store';
import { createMemoryPreparedStemsBackend } from '../prepared/prepared-stem-test-support';
import {
  createStemLoader,
  StemMissingError,
  type StemTrack,
} from './create-stem-loader';

const RATE = 8000;
const SAMPLES = 4000;

const setup = (tracks: StemTrack[]) => {
  const memory = createMemoryPreparedStemsBackend();
  const store = createPreparedStemStore(memory.backend);
  const calls = { fetch: 0, decode: 0 };
  const loader = createStemLoader({
    compositeId: 'c1',
    stems: [
      { id: 's1', trackId: 't1' },
      { id: 's2', trackId: 'gone' },
    ],
    getTrack: (trackId) => tracks.find((track) => track.id === trackId),
    store,
    fetchBlob: async () => {
      calls.fetch += 1;

      return new Blob(['audio']);
    },
    decode: async () => {
      calls.decode += 1;

      return {
        channels: [new Float32Array(SAMPLES).fill(0.25)],
        sampleRate: RATE,
      };
    },
    targetSampleRate: RATE,
  });
  const load = (stemId: string, signal = new AbortController().signal) => {
    const progress: number[] = [];

    return {
      progress,
      result: loader({
        stemId,
        signal,
        onProgress: (fraction) => progress.push(fraction),
      }),
    };
  };

  return { ...memory, calls, load, store };
};

describe('createStemLoader', () => {
  it('fetches, prepares and opens a stem the first time, reporting rising progress', async () => {
    const t = setup([{ id: 't1', version: 'v1' }]);
    const { result, progress } = t.load('s1');
    const reader = await result;

    assert.equal(reader.sampleCount, SAMPLES);
    assert.deepEqual(t.calls, { fetch: 1, decode: 1 });
    assert.equal(progress[0], 0.6);
    assert.equal(progress[progress.length - 1], 1);
    assert.deepEqual(
      progress,
      [...progress].sort((a, b) => a - b),
    );
  });

  it('opens an already prepared stem without fetching or decoding', async () => {
    const t = setup([{ id: 't1', version: 'v1' }]);

    await t.load('s1').result;
    t.calls.fetch = 0;
    t.calls.decode = 0;

    const second = t.load('s1');

    assert.equal((await second.result).sampleCount, SAMPLES);
    assert.deepEqual(t.calls, { fetch: 0, decode: 0 });
    assert.deepEqual(second.progress, [1]);
  });

  it('prepares again when the track changed since the stem was prepared', async () => {
    const tracks: StemTrack[] = [{ id: 't1', version: 'v1' }];
    const t = setup(tracks);

    await t.load('s1').result;
    tracks[0] = { id: 't1', version: 'v2' };
    await t.load('s1').result;

    assert.equal(t.calls.fetch, 2);
    assert.equal(t.recordIds().length, 1);
  });

  it('never reuses a stem from a track with no version', async () => {
    const t = setup([{ id: 't1' }]);

    await t.load('s1').result;
    await t.load('s1').result;

    assert.equal(t.calls.fetch, 2);
  });

  it('flags a stem whose track left the library as missing', async () => {
    const t = setup([{ id: 't1', version: 'v1' }]);

    await assert.rejects(t.load('s2').result, StemMissingError);
    await assert.rejects(t.load('nope').result, StemMissingError);
    assert.deepEqual(t.calls, { fetch: 0, decode: 0 });
  });

  it('stops without keeping a stem when superseded after the download', async () => {
    const t = setup([{ id: 't1', version: 'v1' }]);
    const controller = new AbortController();
    const { result } = t.load('s1', controller.signal);

    controller.abort();

    await assert.rejects(result, isSavedTrackDownloadAbortError);
    assert.equal(t.calls.decode, 0);
    assert.deepEqual(t.recordIds(), []);
  });
});
