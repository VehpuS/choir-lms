/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AUTHORIZED_STATE,
  PLAYABLE_SOURCE,
  UNSUPPORTED_SOURCE,
} from '../../test-utils/library-test-fixtures.js';
import {
  getSavedRehearsalLibrarySourceIssue,
  getSavedRehearsalLibraryStatusCopy,
  resolveSavedRehearsalLibrarySources,
} from '../utils/saved-rehearsal-library-view-model.js';

describe('saved rehearsal library view-model', () => {
  it('marks saved tracks unavailable until Drive access is restored', () => {
    const savedSources = resolveSavedRehearsalLibrarySources({
      authState: {
        ...AUTHORIZED_STATE,
        status: 'expired',
      },
      savedSources: [PLAYABLE_SOURCE],
      visibleSources: [
        {
          ...PLAYABLE_SOURCE,
          modifiedTime: '2026-05-11T10:00:00.000Z',
        },
      ],
    });

    assert.equal(savedSources[0]?.availability.status, 'unavailable');
    assert.equal(
      savedSources[0]?.availability.reason,
      'authorization-required',
    );
    assert.equal(
      savedSources[0]?.availability.message,
      'Reconnect Google Drive to restore this saved rehearsal track.',
    );
  });

  it('uses refreshed discovery metadata for saved tracks when Drive is authorized', () => {
    const refreshedSource = {
      ...PLAYABLE_SOURCE,
      modifiedTime: '2026-05-11T10:00:00.000Z',
      locationLabel: 'Shared with you',
    };

    const savedSources = resolveSavedRehearsalLibrarySources({
      authState: AUTHORIZED_STATE,
      savedSources: [PLAYABLE_SOURCE],
      visibleSources: [refreshedSource],
    });

    assert.deepEqual(savedSources, [refreshedSource]);
  });

  it('summarizes saved-library readiness and access warnings', () => {
    const readyCopy = getSavedRehearsalLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      isLoading: false,
      issue: null,
      savedSources: [PLAYABLE_SOURCE],
    });

    assert.equal(readyCopy.tone, 'ready');
    assert.equal(readyCopy.title, 'Saved rehearsal library ready');
    assert.equal(
      readyCopy.message,
      '1 saved track available for playback, loops, and playlists.',
    );

    const warningCopy = getSavedRehearsalLibraryStatusCopy({
      authState: {
        ...AUTHORIZED_STATE,
        status: 'attention-required',
      },
      isLoading: false,
      issue: null,
      savedSources: [
        {
          ...PLAYABLE_SOURCE,
          availability: {
            status: 'unavailable',
            reason: 'access-revoked',
            message:
              'Connect Google Drive to verify or play this saved rehearsal track.',
          },
        },
      ],
    });

    assert.equal(warningCopy.tone, 'warning');
    assert.equal(warningCopy.title, 'Saved tracks need Drive access');
    assert.match(warningCopy.message, /1 saved track remain[s]? visible/);
  });

  it('uses a load-safe error title when the saved library reports an issue', () => {
    const copy = getSavedRehearsalLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      isLoading: false,
      issue: {
        kind: 'storage',
        title: 'Saved rehearsal storage unavailable',
        message:
          'This build could not access the device storage needed for the saved rehearsal library.',
      },
      savedSources: [],
    });

    assert.equal(copy.tone, 'error');
    assert.equal(copy.title, 'Saved rehearsal storage unavailable');
    assert.equal(
      copy.message,
      'This build could not access the device storage needed for the saved rehearsal library.',
    );
  });

  it('keeps save-specific failures off the section status card', () => {
    const copy = getSavedRehearsalLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      isLoading: false,
      issue: {
        kind: 'save',
        sourceId: PLAYABLE_SOURCE.id,
        title: 'Could not save track',
        message:
          'The saved rehearsal library could not save "Warmup.mp3". quota exceeded',
      },
      savedSources: [],
    });

    assert.equal(copy.tone, 'neutral');
    assert.equal(copy.title, 'No saved tracks yet');
  });

  it('maps save-specific failures onto the source card that triggered them', () => {
    const issue = {
      kind: 'save' as const,
      sourceId: PLAYABLE_SOURCE.id,
      title: 'Could not save track',
      message:
        'The saved rehearsal library could not save "Alto Line.mp3". quota exceeded',
    };

    assert.equal(
      getSavedRehearsalLibrarySourceIssue(issue, PLAYABLE_SOURCE, 'save'),
      'The saved rehearsal library could not save "Alto Line.mp3". quota exceeded',
    );
    assert.equal(
      getSavedRehearsalLibrarySourceIssue(issue, UNSUPPORTED_SOURCE, 'save'),
      undefined,
    );
    assert.equal(
      getSavedRehearsalLibrarySourceIssue(issue, PLAYABLE_SOURCE, 'remove'),
      undefined,
    );
  });
});
