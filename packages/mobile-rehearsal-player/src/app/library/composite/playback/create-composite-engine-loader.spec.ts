import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  CompositeTrack,
  DriveAudioSource,
  PlayableItem,
} from '@org/audio-library-models';

import { createPreparedStemStore } from '../prepared/prepared-stem-store';
import { createMemoryPreparedStemsBackend } from '../prepared/prepared-stem-test-support';
import { createTestEngine } from './composite-test-engine';
import { createCompositeEngineLoader } from './create-composite-engine-loader';

const RATE = 8000;

const source = (id: string, modifiedTime?: string): DriveAudioSource =>
  ({
    id,
    provider: 'google-drive',
    driveFileId: `drive-${id}`,
    name: `${id}.mp3`,
    mimeType: 'audio/mpeg',
    modifiedTime,
  }) as DriveAudioSource;

const composite: CompositeTrack = {
  id: 'c1',
  name: 'Song',
  createdAt: '2026-01-01T00:00:00.000Z',
  defaultMix: { levels: {} },
  presets: [],
  stems: [
    { id: 's1', trackId: 't1', name: 'Soprano', offsetMs: 0, mine: false },
    { id: 's2', trackId: 't2', name: 'Bass', offsetMs: 0, mine: false },
  ],
};

const item = { source: { id: 'c1' } } as unknown as PlayableItem;

const setup = (library: DriveAudioSource[]) => {
  const memory = createMemoryPreparedStemsBackend();
  const built: string[][] = [];
  const failed: string[][] = [];
  const fetched: Array<string | null> = [];
  const loader = createCompositeEngineLoader(
    {
      getComposite: (id) => (id === 'c1' ? composite : undefined),
      getTrack: (trackId) => library.find((s) => s.id === trackId),
      onStemsFailed: (_id, list) => failed.push(list.map((f) => f.stemId)),
    },
    {
      getContext: () => ({
        sampleRate: RATE,
        decodeAudioData: async () => ({
          numberOfChannels: 2,
          sampleRate: RATE,
          getChannelData: () => new Float32Array(RATE).fill(0.1),
        }),
      }),
      store: createPreparedStemStore(memory.backend),
      fetchBlob: async (track, token) => {
        fetched.push(token);

        return new Blob([track.id]);
      },
      createEngine: async (options) => {
        built.push(options.stems.map((stem) => stem.id));

        return createTestEngine().engine;
      },
    },
  );

  return { built, failed, fetched, loader, memory };
};

describe('createCompositeEngineLoader', () => {
  it('prepares every stem from the library and builds the engine', async () => {
    const t = setup([source('t1', 'v1'), source('t2', 'v1')]);

    await t.loader(item, { accessToken: 'token' });

    assert.deepEqual(t.built, [['s1', 's2']]);
    assert.deepEqual(t.fetched, ['token', 'token']);
    assert.equal(t.memory.recordIds().length, 2);
  });

  it('plays the stems whose tracks are still in the library and reports the rest', async () => {
    const t = setup([source('t1', 'v1')]);

    await t.loader(item, {});

    assert.deepEqual(t.built, [['s1']]);
    assert.deepEqual(t.failed, [['s2']]);
  });

  it('does not load a composite that is no longer in the library', async () => {
    const t = setup([]);

    await assert.rejects(
      t.loader({ source: { id: 'other' } } as unknown as PlayableItem, {}),
      /no longer in the library/,
    );
  });
});
