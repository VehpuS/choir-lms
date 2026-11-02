import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioSource } from '@org/audio-library-models';

import type { OfflineState } from '../offline/offline-state-store';

import { buildRecordingFixture } from './recording-fixtures.js';
import {
  NO_QUEUE_REASON,
  getDeleteRecordingsTitle,
  getRecordingsBulkModel,
  getRecordingsQueueAcknowledgment,
} from './recordings-bulk-model.js';

const track = (id: string) =>
  ({
    id,
    driveFileId: `drive-${id}`,
    name: `${id}.mp3`,
    modifiedTime: 'v1',
  }) as DriveAudioSource;
const recordingOn = (recordingId: string, trackId: string) =>
  buildRecordingFixture({
    id: recordingId,
    lineage: {
      track: {
        id: trackId,
        driveFileId: `drive-${trackId}`,
        name: `${trackId}.mp3`,
      },
    },
    source: {
      driveFileId: `drive-${trackId}`,
      name: `${trackId}.mp3`,
      contentVersion: 'v1',
      durationMs: 240_000,
    },
  });
const build = (
  selected: ReturnType<typeof recordingOn>[],
  options: { canQueue?: boolean; states?: Record<string, OfflineState> } = {},
) => {
  const sources = [track('a'), track('b')];

  return getRecordingsBulkModel({
    selected,
    canQueue: options.canQueue ?? true,
    library: { sources, loops: [] },
    offline: {
      sources,
      stateOf: (id) => options.states?.[id] ?? 'none',
    },
  });
};

describe('getRecordingsBulkModel', () => {
  it('offers the bulk actions in bar order with delete last', () => {
    const model = build([recordingOn('r1', 'a')]);

    assert.deepEqual(
      model.actions.map((action) => action.id),
      [
        'play-next',
        'add-to-queue',
        'add-to-playlist',
        'offline',
        'export',
        'delete',
      ],
    );
    assert.equal(model.actions[5].tone, 'destructive');
  });

  it('plays the recordings whose track is still in the library and counts the rest', () => {
    const model = build([recordingOn('r1', 'a'), recordingOn('r2', 'gone')]);

    assert.equal(model.playable.length, 1);
    assert.equal(model.leftOutCount, 1);
    assert.equal(model.actions[0].isDisabled, false);
  });

  it('explains that the queue needs something playing', () => {
    const [playNext] = build([recordingOn('r1', 'a')], {
      canQueue: false,
    }).actions;

    assert.equal(playNext.isDisabled, true);
    assert.equal(playNext.disabledReason, NO_QUEUE_REASON);
  });

  it('disables the queue actions when nothing selected can play', () => {
    const [playNext] = build([recordingOn('r1', 'gone')]).actions;

    assert.equal(playNext.isDisabled, true);
  });

  it('keeps each track once and switches to Remove when all are kept', () => {
    const several = [recordingOn('r1', 'a'), recordingOn('r2', 'a')];

    assert.equal(build(several).offline.sources.length, 1);
    assert.equal(
      build(several, { states: { 'drive-a': 'kept' } }).offline.kind,
      'remove',
    );
  });
});

describe('recordings bulk copy', () => {
  it('names what was queued and what was left out', () => {
    const model = build([recordingOn('r1', 'a'), recordingOn('r2', 'gone')]);

    assert.deepEqual(getRecordingsQueueAcknowledgment('add-to-queue', model), {
      title: 'Added to queue',
      message:
        '1 recording added to the end of the queue. 1 recording left out: the track is no longer in your library.',
    });
  });

  it('pluralizes the delete title', () => {
    assert.equal(getDeleteRecordingsTitle(1), 'Delete 1 recording?');
    assert.equal(getDeleteRecordingsTitle(3), 'Delete 3 recordings?');
  });
});
