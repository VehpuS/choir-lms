/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../test-utils/library-test-fixtures.js';
import {
  buildNamedLoop,
  getSavedLoopItemIssue,
  getSavedLoopRemovalCopy,
  getSavedLoopsStatusCopy,
  resolveSavedLoopCards,
} from './saved-loop-view-model.js';

describe('saved loop view-model', () => {
  it('builds named loops from saved-track markers and resolves them for playback', () => {
    const result = buildNamedLoop({
      createId: () => 'loop-1',
      endMs: 18500,
      loopName: '  Entrance cue  ',
      now: '2026-05-10T00:00:00.000Z',
      ownerId: 'user-1',
      source: PLAYABLE_SOURCE,
      startMs: 12000,
    });

    assert.equal(result.issue, null);
    assert.deepEqual(result.loop, SAVED_LOOP);

    const [loopCard] = resolveSavedLoopCards([SAVED_LOOP], [PLAYABLE_SOURCE]);

    assert.equal(
      loopCard?.metadataLabel,
      'Parent track: Alto Line.mp3 • 0:12 to 0:18',
    );
    assert.deepEqual(loopCard?.parentTrack, {
      id: PLAYABLE_SOURCE.id,
      name: PLAYABLE_SOURCE.name,
    });
    assert.equal(loopCard?.playableItem?.id, 'loop:loop-1');
    assert.equal(loopCard?.rangeLabel, '0:12 to 0:18');
    assert.equal(loopCard?.message, undefined);
  });

  it('preserves loop identity and createdAt when saving an edited loop', () => {
    const result = buildNamedLoop({
      endMs: 24000,
      existingLoop: {
        createdAt: SAVED_LOOP.createdAt,
        id: SAVED_LOOP.id,
        tags: ['Alto', 'Entrances'],
      },
      loopName: '  Entrance cue reprise  ',
      now: '2026-05-10T02:00:00.000Z',
      ownerId: SAVED_LOOP.ownerId,
      source: PLAYABLE_SOURCE,
      startMs: 15000,
    });

    assert.equal(result.issue, null);
    assert.deepEqual(result.loop, {
      ...SAVED_LOOP,
      name: 'Entrance cue reprise',
      tags: ['Alto', 'Entrances'],
      startMs: 15000,
      endMs: 24000,
      updatedAt: '2026-05-10T02:00:00.000Z',
    });
  });

  it('rejects invalid loop saves and warns when saved loops lose their source', () => {
    const invalidRangeResult = buildNamedLoop({
      endMs: 12000,
      loopName: 'Verse repeat',
      ownerId: 'user-1',
      source: PLAYABLE_SOURCE,
      startMs: 12000,
    });

    assert.deepEqual(invalidRangeResult, {
      issue: {
        title: 'Invalid loop range',
        message: 'Loop end must be after the loop start.',
      },
      loop: null,
    });

    const [missingSourceLoopCard] = resolveSavedLoopCards([SAVED_LOOP], []);

    assert.deepEqual(missingSourceLoopCard?.parentTrack, {
      id: SAVED_LOOP.sourceId,
      name: SAVED_LOOP.sourceName,
    });
    assert.equal(missingSourceLoopCard?.playableItem, null);
    assert.equal(missingSourceLoopCard?.rangeLabel, '0:12 to 0:18');
    assert.match(
      missingSourceLoopCard?.message ?? '',
      /Restore the saved source track/,
    );

    const copy = getSavedLoopsStatusCopy({
      isLoading: false,
      issue: null,
      savedLoopCount: 1,
      unresolvedLoopCount: 1,
    });

    assert.equal(copy.tone, 'warning');
    assert.equal(copy.title, 'Saved loops need attention');
  });

  it('builds destructive copy and maps delete failures to the affected loop', () => {
    assert.deepEqual(getSavedLoopRemovalCopy(SAVED_LOOP), {
      confirmLabel: 'Remove loop',
      message:
        '"Entrance cue" (Alto Line.mp3 • 0:12 to 0:18) will be removed from your saved practice loops.',
      title: 'Remove saved loop?',
    });

    assert.equal(
      getSavedLoopItemIssue(
        {
          kind: 'delete',
          loopId: SAVED_LOOP.id,
          title: 'Could not remove loop',
          message:
            'The rehearsal library could not remove the loop "Entrance cue".',
        },
        SAVED_LOOP.id,
      ),
      'The rehearsal library could not remove the loop "Entrance cue".',
    );
    assert.equal(
      getSavedLoopItemIssue(
        {
          kind: 'delete',
          loopId: SAVED_LOOP.id,
          title: 'Could not remove loop',
          message:
            'The rehearsal library could not remove the loop "Entrance cue".',
        },
        'missing-loop',
      ),
      undefined,
    );
  });
});
