import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioSource } from '@org/audio-library-models';

import type { OfflineBatchRunner } from '../../offline/offline-batch';
import type { OfflineState } from '../../offline/offline-state-store';
import {
  COMPOSITE_RECONNECT_MESSAGE,
  KEEP_STEMS_OFFLINE_LABEL,
  REMOVE_STEMS_OFFLINE_LABEL,
  resolveCompositeOfflineActions,
  resolveCompositeOfflineSources,
  resolveCompositeOfflineState,
  runCompositeOffline,
} from './composite-offline';

const stem = (id: string, trackId: string) => ({
  id,
  trackId,
  name: id,
  offsetMs: 0,
  mine: false,
});
const file = (id: string, driveFileId = `drive-${id}`, modifiedTime = 'v1') =>
  ({ id, driveFileId, modifiedTime }) as DriveAudioSource;
const noop = () => undefined;
const menuState = (state: OfflineState, canKeep = true) => ({
  canKeep,
  onKeep: noop,
  onRemove: noop,
  state,
});

describe('resolveCompositeOfflineSources', () => {
  it('lists each stem file once and skips a stem whose track is gone', () => {
    const sources = [file('a'), file('b', 'drive-a')];
    const composite = {
      stems: [stem('s1', 'a'), stem('s2', 'b'), stem('s3', 'missing')],
    };

    assert.deepEqual(
      resolveCompositeOfflineSources(composite, sources).map(({ id }) => id),
      ['a'],
    );
  });
});

describe('resolveCompositeOfflineState', () => {
  const files = [file('a'), file('b')];
  const stateOf = (states: Record<string, OfflineState>) =>
    resolveCompositeOfflineState(files, (id) => states[id] ?? 'none');

  it('is kept only when every stem file is kept', () => {
    assert.equal(
      stateOf({ 'drive-a': 'kept', 'drive-b': 'kept' }).state,
      'kept',
    );
    assert.equal(stateOf({ 'drive-a': 'kept' }).state, 'none');
  });

  it('is downloading while any stem file downloads', () => {
    assert.equal(
      stateOf({ 'drive-a': 'kept', 'drive-b': 'downloading' }).state,
      'downloading',
    );
  });

  it('cannot keep with no stem files or a file with no Drive version', () => {
    assert.equal(resolveCompositeOfflineState([], () => 'none').canKeep, false);
    assert.equal(
      resolveCompositeOfflineState(
        [{ driveFileId: 'x', modifiedTime: undefined }],
        () => 'none',
      ).canKeep,
      false,
    );
    assert.equal(stateOf({}).canKeep, true);
  });
});

describe('resolveCompositeOfflineActions', () => {
  it('says every stem in the keep and remove rows', () => {
    assert.deepEqual(
      resolveCompositeOfflineActions(menuState('none')).map((a) => a.label),
      [KEEP_STEMS_OFFLINE_LABEL],
    );
    assert.deepEqual(
      resolveCompositeOfflineActions(menuState('kept')).map((a) => a.label),
      [REMOVE_STEMS_OFFLINE_LABEL],
    );
  });

  it('keeps the disabled downloading row and offers nothing where offline is unsupported', () => {
    const [downloading] = resolveCompositeOfflineActions(
      menuState('downloading'),
    );

    assert.equal(downloading.label, 'Downloading…');
    assert.equal(downloading.disabled, true);
    assert.deepEqual(resolveCompositeOfflineActions(undefined), []);
  });

  it('disables the keep row when a stem cannot be cached', () => {
    const [keep] = resolveCompositeOfflineActions(menuState('none', false));

    assert.equal(keep.disabled, true);
  });
});

describe('runCompositeOffline', () => {
  const sources = [file('a'), file('b')];
  const makeRunner = (overrides: Partial<OfflineBatchRunner> = {}) => {
    const calls: string[] = [];
    const runner: OfflineBatchRunner = {
      keepSources: async (list) => {
        calls.push(`keep:${list.length}`);

        return { failed: 0, kept: list.length, notStored: 0 };
      },
      removeSources: async (list) => {
        calls.push(`remove:${list.length}`);
      },
      ...overrides,
    };

    return { calls, runner };
  };

  it('keeps every stem file and reports the count', async () => {
    const { calls, runner } = makeRunner();
    const result = await runCompositeOffline({ kind: 'keep', runner, sources });

    assert.deepEqual(calls, ['keep:2']);
    assert.equal(result.title, 'Kept offline');
    assert.match(result.message, /2 files kept offline/);
  });

  it('reports a stem that could not be stored', async () => {
    const { runner } = makeRunner({
      keepSources: async () => ({ failed: 0, kept: 1, notStored: 1 }),
    });
    const result = await runCompositeOffline({ kind: 'keep', runner, sources });

    assert.equal(result.title, 'Some files were not kept');
  });

  it('removes every stem file', async () => {
    const { calls, runner } = makeRunner();
    const result = await runCompositeOffline({
      kind: 'remove',
      runner,
      sources,
    });

    assert.deepEqual(calls, ['remove:2']);
    assert.equal(result.title, 'Removed from offline');
  });

  it('asks to reconnect with no runner and reports a thrown failure', async () => {
    const none = await runCompositeOffline({
      kind: 'keep',
      runner: null,
      sources,
    });
    const { runner } = makeRunner({
      keepSources: () => Promise.reject(new Error('Offline.')),
    });
    const failed = await runCompositeOffline({
      kind: 'keep',
      runner,
      sources,
    });

    assert.equal(none.message, COMPOSITE_RECONNECT_MESSAGE);
    assert.equal(failed.message, 'Offline.');
    assert.equal(failed.title, 'Could not keep offline');
  });
});
