/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLoopPlayableItem,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../test-utils/library-test-fixtures.js';
import {
  buildNamedLoop,
  getSavedLoopItemIssue,
  getSavedLoopRemovalCopy,
  getSavedLoopsStatusCopy,
  resolveLoopBuilderTrack,
  resolveSavedLoopCards,
} from '../utils/saved-loop-view-model.js';

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

    assert.equal(loopCard?.metadataLabel, 'Alto Line.mp3 • 0:12 to 0:18');
    assert.equal(loopCard?.playableItem?.id, 'loop:loop-1');
    assert.equal(loopCard?.message, undefined);
  });

  it('lets the loop builder follow an explicitly selected saved track', () => {
    const selectedTrack = resolveLoopBuilderTrack({
      activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
      savedSources: [PLAYABLE_SOURCE],
      selectedSourceId: PLAYABLE_SOURCE.id,
    });

    assert.deepEqual(selectedTrack, createTrackPlayableItem(PLAYABLE_SOURCE));
  });

  it('falls back to the active full track when no loop source is explicitly selected', () => {
    const activeTrack = createTrackPlayableItem(PLAYABLE_SOURCE);

    assert.deepEqual(
      resolveLoopBuilderTrack({
        activePlayableItem: activeTrack,
        savedSources: [PLAYABLE_SOURCE],
        selectedSourceId: null,
      }),
      activeTrack,
    );
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

    assert.equal(missingSourceLoopCard?.playableItem, null);
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
