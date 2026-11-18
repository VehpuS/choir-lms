import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioSource } from '@org/audio-library-models';

import type { CompositeEngine } from '../../composite/engine/composite-engine';
import { createTestEngine } from '../../composite/playback/composite-test-engine';
import { isSavedTrackDownloadAbortError } from '../utils/saved-track-blob-download';
import { createListeningTrackLoads } from './listening-track-loads';

const track = (id: string) => ({ id }) as DriveAudioSource;

/** A loader whose loads finish when the spec says so. */
const setup = () => {
  const pending: Array<{
    signal: AbortSignal | undefined;
    finish: (engine: CompositeEngine) => void;
  }> = [];
  const loads = createListeningTrackLoads(
    (_track, options) =>
      new Promise<CompositeEngine>((resolve) => {
        pending.push({ signal: options?.signal, finish: resolve });
      }),
  );

  return { loads, pending };
};

describe('createListeningTrackLoads', () => {
  it('gives the engine of a load that was not superseded', async () => {
    const { loads, pending } = setup();
    const test = createTestEngine();
    const load = loads.load(track('t1'), { accessToken: 'token' });

    pending[0].finish(test.engine);

    assert.equal(await load, test.engine);
    assert.equal(test.state.disposed, false);
  });

  it('aborts the load in flight when another starts, and disposes its engine if it was built', async () => {
    const { loads, pending } = setup();
    const first = createTestEngine();
    const second = createTestEngine();
    const firstLoad = loads.load(track('t1'), { accessToken: null });
    const secondLoad = loads.load(track('t2'), { accessToken: null });

    assert.equal(pending[0].signal?.aborted, true);

    pending[0].finish(first.engine);
    pending[1].finish(second.engine);

    await assert.rejects(firstLoad, isSavedTrackDownloadAbortError);
    assert.equal(first.state.disposed, true);
    assert.equal(await secondLoad, second.engine);
  });

  it('is superseded by any other load too', async () => {
    const { loads, pending } = setup();
    const test = createTestEngine();
    const load = loads.load(track('t1'), { accessToken: null });

    loads.supersede();
    pending[0].finish(test.engine);

    await assert.rejects(load, isSavedTrackDownloadAbortError);
    assert.equal(test.state.disposed, true);
  });
});
