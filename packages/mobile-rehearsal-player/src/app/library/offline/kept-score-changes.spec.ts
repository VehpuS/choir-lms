import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioSource } from '@org/audio-library-models';

import { findSourcesWithNewScores } from './kept-score-changes.js';

const track = (driveFileId: string, scoreIds: string[]): DriveAudioSource => {
  return {
    driveFileId,
    sheetMusic: scoreIds.map((fileId) => ({
      format: 'pdf',
      id: `sm-${fileId}`,
      label: fileId,
      location: { fileId, kind: 'drive', name: `${fileId}.pdf` },
      addedAt: '2026-01-01T00:00:00.000Z',
    })),
  } as unknown as DriveAudioSource;
};

describe('finding kept tracks with new scores', () => {
  const kept = new Set(['a']);
  const isKept = (id: string) => kept.has(id);

  it('does nothing the first time a track is seen', () => {
    const previous = new Map<string, string>();

    assert.deepEqual(
      findSourcesWithNewScores([track('a', ['s1'])], previous, isKept),
      [],
    );
    assert.equal(previous.get('a'), 's1');
  });

  it('returns a kept track whose scores changed, once', () => {
    const previous = new Map([['a', 's1']]);
    const grown = track('a', ['s1', 's2']);

    assert.deepEqual(findSourcesWithNewScores([grown], previous, isKept), [
      grown,
    ]);
    assert.deepEqual(findSourcesWithNewScores([grown], previous, isKept), []);
  });

  it('ignores tracks that are not kept and removals of the last score', () => {
    const previous = new Map([
      ['a', 's1'],
      ['b', ''],
    ]);

    assert.deepEqual(
      findSourcesWithNewScores(
        [track('a', []), track('b', ['s9'])],
        previous,
        isKept,
      ),
      [],
    );
  });
});
