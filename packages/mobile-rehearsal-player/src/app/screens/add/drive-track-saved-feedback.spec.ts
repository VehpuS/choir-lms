/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveTrackSavedFeedback,
  resolveNewlySavedSource,
  resolveTrackSaveDetection,
} from './drive-track-saved-feedback.js';

describe('createDriveTrackSavedFeedback', () => {
  it('names the saved track in the message and uses the track id as the feedback id', () => {
    const feedback = createDriveTrackSavedFeedback({
      trackId: 'track-1',
      trackName: 'Alto warm-up',
    });

    assert.deepEqual(feedback, {
      id: 'track-1',
      message: 'Alto warm-up was saved to your rehearsal library.',
      title: 'Track saved',
    });
  });
});

describe('resolveNewlySavedSource', () => {
  it('returns the source whose id was not in the previous set', () => {
    const previouslySavedIds = new Set(['a']);
    const currentSources = [
      { id: 'a', name: 'Already saved' },
      { id: 'b', name: 'Just saved' },
    ];

    assert.deepEqual(
      resolveNewlySavedSource(previouslySavedIds, currentSources),
      { id: 'b', name: 'Just saved' },
    );
  });

  it('returns null when every current source was already in the previous set', () => {
    const previouslySavedIds = new Set(['a', 'b']);
    const currentSources = [
      { id: 'a', name: 'Already saved' },
      { id: 'b', name: 'Also already saved' },
    ];

    assert.equal(
      resolveNewlySavedSource(previouslySavedIds, currentSources),
      null,
    );
  });

  it('returns null when there are no current sources', () => {
    assert.equal(resolveNewlySavedSource(new Set(), []), null);
  });
});

describe('resolveTrackSaveDetection', () => {
  it('does not touch the baseline or report a save while still loading, even with a null baseline', () => {
    const result = resolveTrackSaveDetection({
      currentSources: [],
      isLoading: true,
      previouslySavedIds: null,
    });

    assert.equal(result.newlySavedSource, null);
    assert.equal(result.nextBaselineIds, null);
  });

  it('regression: does not treat every pre-existing source as newly saved once the initial (previously empty) load resolves', () => {
    // This is the exact sequence that reproduced live: mount while loading
    // (empty sources, no baseline yet), then the load resolves with sources
    // that were already saved before this screen ever mounted.
    const loadingRun = resolveTrackSaveDetection({
      currentSources: [],
      isLoading: true,
      previouslySavedIds: null,
    });
    const loadedRun = resolveTrackSaveDetection({
      currentSources: [{ id: 'a', name: 'Already saved' }],
      isLoading: false,
      previouslySavedIds: loadingRun.nextBaselineIds,
    });

    assert.equal(loadedRun.newlySavedSource, null);
    assert.deepEqual(loadedRun.nextBaselineIds, new Set(['a']));
  });

  it('establishes the baseline on the first post-load run without reporting a save', () => {
    const result = resolveTrackSaveDetection({
      currentSources: [{ id: 'a', name: 'Already saved' }],
      isLoading: false,
      previouslySavedIds: null,
    });

    assert.equal(result.newlySavedSource, null);
    assert.deepEqual(result.nextBaselineIds, new Set(['a']));
  });

  it('reports a genuinely newly saved source on a later run', () => {
    const baseline = resolveTrackSaveDetection({
      currentSources: [{ id: 'a', name: 'Already saved' }],
      isLoading: false,
      previouslySavedIds: null,
    });
    const afterSave = resolveTrackSaveDetection({
      currentSources: [
        { id: 'a', name: 'Already saved' },
        { id: 'b', name: 'Just saved' },
      ],
      isLoading: false,
      previouslySavedIds: baseline.nextBaselineIds,
    });

    assert.deepEqual(afterSave.newlySavedSource, {
      id: 'b',
      name: 'Just saved',
    });
  });
});
