/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import {
  createSavedTrackPlaybackRuntimeIssue,
  resolveStoredOnly,
} from './saved-track-playback-view-model.js';
import { StoredCopyUnavailableError } from './stored-copy-unavailable-error.js';

describe('stored copy playback', () => {
  it('plays from the stored copy with no session, or when offline, where audio is stored', () => {
    const stored = (accessToken: string | null, isOffline: boolean) => {
      return resolveStoredOnly({
        accessToken,
        canPlayStoredCopies: true,
        isOffline,
      });
    };

    assert.equal(stored(null, false), true);
    assert.equal(stored('token', true), true);
    assert.equal(stored('token', false), false);
  });

  it('never plays from a stored copy where nothing is stored', () => {
    assert.equal(
      resolveStoredOnly({
        accessToken: null,
        canPlayStoredCopies: false,
        isOffline: true,
      }),
      false,
    );
  });

  it('says an uncached file offline needs a connection', () => {
    const issue = createSavedTrackPlaybackRuntimeIssue(
      createTrackPlayableItem(PLAYABLE_SOURCE),
      new StoredCopyUnavailableError(true),
    );

    assert.equal(issue.title, 'Needs a connection');
  });

  it('asks to reconnect Drive when an uncached file has no session but the device is online', () => {
    const issue = createSavedTrackPlaybackRuntimeIssue(
      createTrackPlayableItem(PLAYABLE_SOURCE),
      new StoredCopyUnavailableError(false),
    );

    assert.equal(issue.title, 'Google Drive access required');
  });
});
