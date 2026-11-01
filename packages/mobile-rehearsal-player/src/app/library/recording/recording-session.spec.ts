import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PLAYBACK_SHAPING,
  type DriveAudioSource,
} from '@org/audio-library-models';

import {
  createFakePcmSource,
  createFakeVisibility,
  settle,
} from '../pitch/pitch-test-support.js';
import { captureRecordingStart } from './recording-metadata.js';
import {
  RECORDING_EXPLAINED_KEY,
  createRecordingSession,
  type RecordingFlagStorage,
  type RecordingStartRequest,
} from './recording-session.js';
import { createRecordingsStore } from './recordings-store.js';
import { createMemoryRecordingsBackend } from './recordings-test-support.js';

const track = {
  id: 'track-1',
  provider: 'google-drive',
  driveFileId: 'drive-1',
  name: 'Song.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 60_000,
  modifiedTime: 'v1',
  createdAt: 'x',
  availability: { status: 'available' },
} as DriveAudioSource;

const request = (): RecordingStartRequest => ({
  draft: captureRecordingStart({
    id: 'rec-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    playing: track,
    parent: track,
    shaping: DEFAULT_PLAYBACK_SHAPING,
    markers: [],
    existingNames: [],
    appliedLatencyMs: 0,
  }),
  getTimeline: (elapsedMs) => [
    {
      recordingStartMs: 0,
      recordingEndMs: elapsedMs,
      trackStartMs: 0,
      held: false,
    },
  ],
});

const flags = (initial: Record<string, string> = {}) => {
  const values = { ...initial };
  const storage: RecordingFlagStorage = {
    getItem: async (key) => values[key] ?? null,
    setItem: async (key, value) => {
      values[key] = value;
    },
  };

  return { storage, values };
};

const setup = (
  options: {
    explained?: boolean;
    estimate?: { quota: number; usage: number } | null;
  } = {},
) => {
  const memory = createMemoryRecordingsBackend();
  const store = createRecordingsStore(memory.backend);
  const source = createFakePcmSource('granted');
  const visibility = createFakeVisibility();
  const f = flags(
    options.explained === false ? {} : { [RECORDING_EXPLAINED_KEY]: 'true' },
  );
  const session = createRecordingSession({
    source,
    store,
    visibility,
    storage: f.storage,
    estimate: async () =>
      options.estimate === undefined
        ? { quota: 100e9, usage: 0 }
        : options.estimate,
  });
  const feed = (blocks: number) => {
    for (let i = 0; i < blocks; i += 1) {
      source.emitBlock({
        samples: new Float32Array(4800).fill(0.25),
        sampleRate: 48_000,
        startTimeSec: 1 + i * 0.1,
      });
    }
  };

  return { session, source, visibility, store, flags: f, feed };
};

describe('recording session', () => {
  it('records on the first request when the explanation was already accepted', async () => {
    const t = setup();

    await t.session.requestStart(async () => request());

    assert.equal(t.session.getState().phase, 'recording');
    assert.equal(t.source.subscriberCount(), 1);
  });

  it('explains first and opens no microphone until Continue, then records', async () => {
    const t = setup({ explained: false });
    let built = 0;

    await t.session.requestStart(async () => {
      built += 1;

      return request();
    });

    assert.equal(t.session.getState().phase, 'explain');
    assert.equal(t.source.subscribeCalls(), 0);
    assert.equal(built, 0);

    await t.session.confirmExplanation();

    assert.equal(t.session.getState().phase, 'recording');
    assert.equal(built, 1);
    assert.equal(t.flags.values[RECORDING_EXPLAINED_KEY], 'true');
  });

  it('goes back to ready on Not now and asks again next time', async () => {
    const t = setup({ explained: false });

    await t.session.requestStart(async () => request());
    t.session.dismiss();

    assert.equal(t.session.getState().phase, 'idle');
    assert.equal(t.flags.values[RECORDING_EXPLAINED_KEY], undefined);
  });

  it('shows a blocked state with the reason when the microphone is denied', async () => {
    const t = setup();

    t.source.failNext('denied');
    await t.session.requestStart(async () => request());

    assert.equal(t.session.getState().phase, 'blocked');
    assert.equal(t.session.getState().blockedReason, 'denied');
  });

  it('refuses without opening the microphone when storage is nearly full', async () => {
    const t = setup({ estimate: { quota: 60e6, usage: 5e6 } });

    await t.session.requestStart(async () => request());

    assert.equal(t.session.getState().phase, 'refused');
    assert.equal(t.source.subscribeCalls(), 0);
  });

  it('counts elapsed time, then stops by hand into a saved recording and a message', async () => {
    const t = setup();

    await t.session.requestStart(async () => request());
    t.feed(25); // 2.5 s
    await settle();

    assert.ok(t.session.getState().elapsedMs >= 2000);

    await t.session.stop();
    const state = t.session.getState();

    assert.equal(state.phase, 'stopped');
    assert.equal(state.savedRecording?.id, 'rec-1');
    assert.equal(state.savedRecording?.durationMs, 2500);
    assert.equal((await t.store.list()).length, 1);
    assert.equal(state.stopMessage?.isProblem, false);
  });

  it('turns a stop the recorder saw itself into the stopped state with its reason', async () => {
    const t = setup();

    await t.session.requestStart(async () => request());
    t.feed(25);
    await settle();
    t.visibility.set(false);
    await settle();

    const state = t.session.getState();

    assert.equal(state.phase, 'stopped');
    assert.match(state.stopMessage?.message ?? '', /background/);
  });

  it('says nothing was saved for a take that was too short', async () => {
    const t = setup();

    await t.session.requestStart(async () => request());
    t.feed(2);
    await t.session.stop();

    assert.match(t.session.getState().stopMessage?.message ?? '', /too short/);
    assert.equal(t.session.getState().savedRecording, undefined);
  });

  it('shows the time left in the ready state only when space is low', async () => {
    const plenty = setup();
    const low = setup({
      estimate: { quota: 50e6 + 96_000 * 60 * 20, usage: 0 },
    });

    await plenty.session.refreshStorage();
    await low.session.refreshStorage();

    assert.equal(plenty.session.getState().timeLeft, null);
    assert.equal(low.session.getState().timeLeft?.tone, 'normal');
  });

  it('anchors the request to the first sample and releases it when the recording ends', async () => {
    const t = setup();
    const events: string[] = [];

    await t.session.requestStart(async () => ({
      ...request(),
      onCaptureStart: (wallMs) => events.push(`origin ${wallMs}`),
      dispose: () => events.push('dispose'),
    }));
    t.source.emitBlock({
      samples: new Float32Array(4800).fill(0.25),
      sampleRate: 48_000,
      startTimeSec: 1,
      wallStartMs: 42,
    });
    await t.session.stop();

    assert.deepEqual(events, ['origin 42', 'dispose']);
  });

  it('releases the request when the microphone cannot be opened', async () => {
    const t = setup();
    let disposed = 0;

    t.source.failNext('denied');
    await t.session.requestStart(async () => ({
      ...request(),
      dispose: () => {
        disposed += 1;
      },
    }));

    assert.equal(disposed, 1);
  });

  it('ignores a second start while already recording', async () => {
    const t = setup();

    await t.session.requestStart(async () => request());
    await t.session.requestStart(async () => request());

    assert.equal(t.source.subscribeCalls(), 1);
  });
});
