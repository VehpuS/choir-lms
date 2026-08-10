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
} from '../../../test-utils/library-test-fixtures.js';
import {
  hydrateLoopBuilderTrackDuration,
  resolveLoopBuilderTrack,
  resolveLoopBuilderTrackDuration,
  resolveSourcesMissingLoopBuilderDuration,
} from './saved-loop-builder-view-model.js';
import {
  createLoopBuilderDraft,
  getDefaultLoopName,
  resolveActiveLoopEditorId,
  updateLoopBuilderDraftRange,
} from './saved-loop-view-model.js';

describe('saved loop builder view-model', () => {
  it('prefills loop drafts with a source-aware suggested name', () => {
    assert.equal(
      getDefaultLoopName({
        endMs: 18500,
        sourceName: PLAYABLE_SOURCE.name,
        startMs: 12000,
      }),
      'Loop 0:12 - 0:18 • Alto Line.mp3',
    );

    assert.deepEqual(
      createLoopBuilderDraft({
        endMs: 18500,
        sourceName: PLAYABLE_SOURCE.name,
        startMs: 12000,
      }),
      {
        endMs: 18500,
        loopName: 'Loop 0:12 - 0:18 • Alto Line.mp3',
        startMs: 12000,
        suggestedLoopName: 'Loop 0:12 - 0:18 • Alto Line.mp3',
      },
    );
  });

  it('keeps following the suggested loop name until the user overrides it', () => {
    const initialDraft = createLoopBuilderDraft({
      endMs: 18500,
      sourceName: PLAYABLE_SOURCE.name,
      startMs: 12000,
    });

    assert.deepEqual(
      updateLoopBuilderDraftRange({
        draft: initialDraft,
        endMs: 47000,
        sourceName: PLAYABLE_SOURCE.name,
        startMs: 30000,
      }),
      {
        endMs: 47000,
        loopName: 'Loop 0:30 - 0:47 • Alto Line.mp3',
        startMs: 30000,
        suggestedLoopName: 'Loop 0:30 - 0:47 • Alto Line.mp3',
      },
    );

    assert.deepEqual(
      updateLoopBuilderDraftRange({
        draft: {
          ...initialDraft,
          loopName: 'Entrance cue',
        },
        endMs: 47000,
        sourceName: PLAYABLE_SOURCE.name,
        startMs: 30000,
      }),
      {
        endMs: 47000,
        loopName: 'Entrance cue',
        startMs: 30000,
        suggestedLoopName: 'Loop 0:30 - 0:47 • Alto Line.mp3',
      },
    );
  });

  it('only keeps a loop marked as editing while the loop builder has a selected track', () => {
    assert.equal(
      resolveActiveLoopEditorId({
        editingLoopId: SAVED_LOOP.id,
        selectedTrack: createTrackPlayableItem(PLAYABLE_SOURCE),
      }),
      SAVED_LOOP.id,
    );

    assert.equal(
      resolveActiveLoopEditorId({
        editingLoopId: SAVED_LOOP.id,
        selectedTrack: null,
      }),
      null,
    );
  });

  it('lets the loop builder follow an explicitly selected saved track', () => {
    const selectedTrack = resolveLoopBuilderTrack({
      savedSources: [PLAYABLE_SOURCE],
      selectedSourceId: PLAYABLE_SOURCE.id,
    });

    assert.deepEqual(selectedTrack, createTrackPlayableItem(PLAYABLE_SOURCE));
  });

  it('requires an explicit saved track selection before opening the loop builder', () => {
    assert.equal(
      resolveLoopBuilderTrack({
        savedSources: [PLAYABLE_SOURCE],
        selectedSourceId: null,
      }),
      null,
    );
  });

  it('hydrates a selected loop-builder track with a fetched duration', () => {
    const selectedTrack = createTrackPlayableItem({
      ...PLAYABLE_SOURCE,
      durationMs: undefined,
    });
    const hydratedTrack = hydrateLoopBuilderTrackDuration(selectedTrack, 93000);

    assert.equal(hydratedTrack?.source.durationMs, 93000);
    assert.equal(hydratedTrack?.range.endMs, 93000);
  });

  it('uses active playback duration when Drive metadata is still missing', () => {
    const selectedTrack = createTrackPlayableItem({
      ...PLAYABLE_SOURCE,
      durationMs: undefined,
    });

    assert.equal(
      resolveLoopBuilderTrackDuration({
        activePlayableItem: selectedTrack,
        playbackDurationSeconds: 93,
        resolvedDurationMs: null,
        selectedTrack,
      }),
      93000,
    );

    assert.equal(
      resolveLoopBuilderTrackDuration({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        playbackDurationSeconds: 93,
        resolvedDurationMs: null,
        selectedTrack,
      }),
      null,
    );
  });

  it('finds saved tracks that still need a duration refresh', () => {
    const sourcesMissingDuration = resolveSourcesMissingLoopBuilderDuration({
      resolvedDurationsBySourceId: {
        'drive:missing-retry': null,
        [PLAYABLE_SOURCE.id]: 93000,
      },
      savedSources: [
        PLAYABLE_SOURCE,
        {
          ...PLAYABLE_SOURCE,
          id: 'drive:missing-duration',
          driveFileId: 'missing-duration',
          durationMs: undefined,
        },
        {
          ...PLAYABLE_SOURCE,
          id: 'drive:missing-retry',
          driveFileId: 'missing-retry',
          durationMs: undefined,
        },
      ],
    });

    assert.deepEqual(sourcesMissingDuration, [
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:missing-duration',
        driveFileId: 'missing-duration',
        durationMs: undefined,
      },
    ]);

    assert.deepEqual(
      resolveSourcesMissingLoopBuilderDuration({
        resolvedDurationsBySourceId: {
          'drive:missing-retry': null,
        },
        retryFailedLookup: true,
        savedSources: [
          {
            ...PLAYABLE_SOURCE,
            id: 'drive:missing-retry',
            driveFileId: 'missing-retry',
            durationMs: undefined,
          },
        ],
      }),
      [
        {
          ...PLAYABLE_SOURCE,
          id: 'drive:missing-retry',
          driveFileId: 'missing-retry',
          durationMs: undefined,
        },
      ],
    );
  });
});
