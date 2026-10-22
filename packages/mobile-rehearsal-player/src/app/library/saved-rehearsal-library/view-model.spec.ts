/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { omit } from 'es-toolkit';

import {
  AUTHORIZED_STATE,
  PLAYABLE_SOURCE,
  UNSUPPORTED_SOURCE,
} from '../../test-utils/library-test-fixtures.js';
import {
  getSavedRehearsalLibrarySourceIssue,
  getSavedRehearsalLibraryStatusCopy,
  resolveSavedRehearsalLibrarySources,
} from './view-model.js';

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

  it('preserves saved tags when Drive refreshes visible source metadata', () => {
    const taggedSource = { ...PLAYABLE_SOURCE, tags: ['Soprano'] };
    const refreshedSource = {
      ...PLAYABLE_SOURCE,
      modifiedTime: '2026-05-11T10:00:00.000Z',
    };

    const savedSources = resolveSavedRehearsalLibrarySources({
      authState: AUTHORIZED_STATE,
      savedSources: [taggedSource],
      visibleSources: [refreshedSource],
    });

    assert.deepEqual(savedSources, [{ ...refreshedSource, tags: ['Soprano'] }]);
  });

  it('keeps saved lyrics and sheet music when a Drive row for the track is on screen', () => {
    const sourceWithExtras = {
      ...PLAYABLE_SOURCE,
      lyrics: {
        origin: 'typed' as const,
        text: 'Kyrie eleison',
        updatedAt: '2026-10-17T00:00:00.000Z',
      },
      sheetMusic: [
        {
          addedAt: '2026-10-17T00:00:00.000Z',
          format: 'pdf' as const,
          id: 'sheet-1',
          label: 'Full score',
          location: { kind: 'url' as const, url: 'https://example.com/a.pdf' },
        },
      ],
    };
    const refreshedSource = {
      ...PLAYABLE_SOURCE,
      modifiedTime: '2026-05-11T10:00:00.000Z',
    };

    const savedSources = resolveSavedRehearsalLibrarySources({
      authState: AUTHORIZED_STATE,
      savedSources: [sourceWithExtras],
      visibleSources: [refreshedSource],
    });

    assert.deepEqual(savedSources, [
      {
        ...refreshedSource,
        lyrics: sourceWithExtras.lyrics,
        sheetMusic: sourceWithExtras.sheetMusic,
      },
    ]);
  });

  it('keeps saved markers when a Drive row for the track is on screen', () => {
    const markedSource = {
      ...PLAYABLE_SOURCE,
      markers: [
        {
          id: 'marker-1',
          name: 'Chorus',
          positionMs: 72_400,
          createdAt: '2026-10-21T00:00:00.000Z',
        },
      ],
    };
    const refreshedSource = {
      ...PLAYABLE_SOURCE,
      modifiedTime: '2026-05-11T10:00:00.000Z',
    };

    const savedSources = resolveSavedRehearsalLibrarySources({
      authState: AUTHORIZED_STATE,
      savedSources: [markedSource],
      visibleSources: [refreshedSource],
    });

    assert.deepEqual(savedSources, [
      { ...refreshedSource, markers: markedSource.markers },
    ]);
  });

  it('keeps saved tag timestamps when a Drive row for the track is on screen', () => {
    const taggedSource = {
      ...PLAYABLE_SOURCE,
      tagAddedAt: { Soprano: '2026-10-01T00:00:00.000Z' },
      tags: ['Soprano'],
    };
    const refreshedSource = { ...PLAYABLE_SOURCE };

    const savedSources = resolveSavedRehearsalLibrarySources({
      authState: AUTHORIZED_STATE,
      savedSources: [taggedSource],
      visibleSources: [refreshedSource],
    });

    assert.deepEqual(savedSources[0]?.tagAddedAt, taggedSource.tagAddedAt);
  });

  it('falls back to the saved duration when the Drive row has none', () => {
    const driveRow = omit(PLAYABLE_SOURCE, ['durationMs']);

    const savedSources = resolveSavedRehearsalLibrarySources({
      authState: AUTHORIZED_STATE,
      savedSources: [{ ...PLAYABLE_SOURCE, durationMs: 123_000 }],
      visibleSources: [driveRow],
    });

    assert.equal(savedSources[0]?.durationMs, 123_000);
  });

  it('prefers the Drive duration over the saved one when Drive reports it', () => {
    const savedSources = resolveSavedRehearsalLibrarySources({
      authState: AUTHORIZED_STATE,
      savedSources: [{ ...PLAYABLE_SOURCE, durationMs: 123_000 }],
      visibleSources: [{ ...PLAYABLE_SOURCE, durationMs: 124_000 }],
    });

    assert.equal(savedSources[0]?.durationMs, 124_000);
  });

  it('preserves saved Drive provenance when Drive refreshes visible source metadata', () => {
    const sourceWithProvenance = {
      ...PLAYABLE_SOURCE,
      sourceLocation: {
        parentFolderId: 'folder-downloads',
        parentFolderName: 'Downloads',
        rootKind: 'my-drive' as const,
        path: [{ id: 'folder-downloads', name: 'Downloads' }],
      },
    };
    const refreshedSource = {
      ...PLAYABLE_SOURCE,
      modifiedTime: '2026-05-11T10:00:00.000Z',
    };

    const savedSources = resolveSavedRehearsalLibrarySources({
      authState: AUTHORIZED_STATE,
      savedSources: [sourceWithProvenance],
      visibleSources: [refreshedSource],
    });

    assert.deepEqual(savedSources, [
      {
        ...refreshedSource,
        sourceLocation: sourceWithProvenance.sourceLocation,
      },
    ]);
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
