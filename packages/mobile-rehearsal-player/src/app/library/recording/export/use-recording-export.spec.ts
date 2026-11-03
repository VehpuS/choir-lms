import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from '@testing-library/react-native/pure';

import { buildRecordingFixture } from '../recording-fixtures';
import type { OriginalResolution } from '../recording-original';
import type { ExportRunnerDependencies } from './recording-export-runner';
import { useRecordingExport } from './use-recording-export';

// The runner is specced on its own; these cases cover what the hook adds: the
// choices it holds, the mix check it runs, and the run it starts and retries.
const readyOriginal: OriginalResolution = {
  changed: false,
  load: async () => ({}) as Blob,
  origin: 'stored',
  status: 'ready',
};

const recordings = [
  buildRecordingFixture({ balance: 80, id: 'a', name: 'Recording a' }),
  buildRecordingFixture({ id: 'b', name: 'Recording b' }),
];

const fakeDependencies = (
  overrides: Partial<ExportRunnerDependencies> = {},
): ExportRunnerDependencies => ({
  decodeTrack: async () => ({
    channels: [new Float32Array(1)],
    sampleRate: 1000,
  }),
  makeBlob: () => ({}) as Blob,
  readRecording: async () => ({ size: 1000 }) as Blob,
  resolveOriginal: async () => readyOriginal,
  saveToDevice: () => undefined,
  upload: async () => ({ status: 'aborted' }),
  ...overrides,
});

const setUp = (
  selected = recordings.slice(0, 1),
  dependencies = fakeDependencies(),
) =>
  renderHook(() =>
    useRecordingExport({
      accessToken: 'token',
      dependencies,
      hasWriteAccess: true,
      recordings: selected,
    }),
  );

describe('useRecordingExport', () => {
  afterEach(() => {
    cleanup();
  });

  it('starts on the recording alone to Drive, at the first recording’s saved balance', () => {
    const { result } = setUp();

    assert.equal(result.current.kind, 'recording');
    assert.equal(result.current.destination, 'drive');
    assert.equal(result.current.balance, 80);
    assert.equal(result.current.isSingle, true);
    assert.equal(result.current.nameValue, 'Song - Recording a.wav');
  });

  it('names a mix with a suffix and keeps a typed name for a single recording', () => {
    const { result } = setUp();

    act(() => result.current.setKind('mix'));
    assert.equal(result.current.nameValue, 'Song - Recording a (mix).wav');

    act(() => result.current.setTypedName('My take'));
    assert.equal(result.current.nameValue, 'My take');
  });

  it('checks the original for each recording when a mix is chosen', async () => {
    const asked: string[] = [];
    const { result } = setUp(
      recordings,
      fakeDependencies({
        resolveOriginal: async (recording) => {
          asked.push(recording.id);

          return recording.id === 'a'
            ? { message: 'Gone.', reason: 'deleted', status: 'unavailable' }
            : { ...readyOriginal, changed: true };
        },
      }),
    );

    assert.equal(result.current.isSingle, false);
    assert.deepEqual(asked, []);

    act(() => result.current.setKind('mix'));
    await waitFor(() => assert.equal(result.current.checked, true));

    assert.deepEqual(asked.sort(), ['a', 'b']);
    assert.equal(result.current.unavailableCount, 1);
    assert.equal(result.current.changedCount, 1);
  });

  it('runs a download for every recording and ends finished', async () => {
    const saved: string[] = [];
    const { result } = setUp(
      recordings,
      fakeDependencies({
        saveToDevice: (fileName) => {
          saved.push(fileName);
        },
      }),
    );

    act(() => result.current.setDestination('download'));
    await act(async () => {
      await result.current.start();
    });

    assert.deepEqual(saved, [
      'Song - Recording a.wav',
      'Song - Recording b.wav',
    ]);
    assert.equal(result.current.run?.step, 'finished');
    assert.deepEqual(
      result.current.run?.items.map((item) => item.status),
      ['done', 'done'],
    );
  });

  it('retries only what failed, with the upload session from the first attempt', async () => {
    const attempts: Array<{ name: string; resumeUri?: string }> = [];
    let failOnce = true;
    const { result } = setUp(
      recordings.slice(0, 1),
      fakeDependencies({
        upload: async (options) => {
          attempts.push({ name: options.name, resumeUri: options.resumeUri });

          if (failOnce) {
            failOnce = false;

            return {
              reason: 'offline',
              resumeUri: 'https://upload/s1',
              status: 'failed',
            };
          }

          return { file: { id: 'f', name: options.name }, status: 'uploaded' };
        },
      }),
    );

    act(() => {
      result.current.chooseFolder({
        folderId: 'folder-1',
        folderName: 'Choir',
        navigation: { stack: [] },
      });
    });
    await act(async () => {
      await result.current.start();
    });

    assert.equal(result.current.run?.items[0]?.failure, 'offline');

    await act(async () => {
      await result.current.retry();
    });

    assert.deepEqual(
      attempts.map((attempt) => attempt.resumeUri),
      [undefined, 'https://upload/s1'],
    );
    assert.equal(result.current.run?.items[0]?.status, 'done');
  });

  it('cancels a running export', async () => {
    let release: () => void = () => undefined;
    const { result } = setUp(
      recordings.slice(0, 1),
      fakeDependencies({
        saveToDevice: () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      }),
    );

    act(() => result.current.setDestination('download'));

    let finished: Promise<void> = Promise.resolve();

    act(() => {
      finished = result.current.start();
    });
    await waitFor(() =>
      assert.equal(result.current.run?.items[0]?.status, 'pending'),
    );
    act(() => result.current.cancel());
    release();
    await act(async () => {
      await finished;
    });

    assert.equal(result.current.run?.step, 'cancelled');
  });
});
