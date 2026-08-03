import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLibraryFilesSessionSnapshot,
  shouldCaptureLibraryFilesSession,
  shouldRestoreLibraryFilesSession,
} from './library-files-session-state';

describe('library files session state', () => {
  it('captures the Files snapshot values without dropping folder, query, sort, or scroll state', () => {
    assert.deepEqual(
      buildLibraryFilesSessionSnapshot({
        activeSearchQuery: 'alto entrance',
        currentFolderId: 'folder-warmups',
        librarySearchQuery: 'alto entrance ',
        scrollOffsetY: 184,
        searchScope: 'all-files',
        sortMode: 'date-opened',
      }),
      {
        activeSearchQuery: 'alto entrance',
        currentFolderId: 'folder-warmups',
        librarySearchQuery: 'alto entrance ',
        scrollOffsetY: 184,
        searchScope: 'all-files',
        sortMode: 'date-opened',
      },
    );
  });

  it('restores only when re-entering Files from another Library view with a saved snapshot', () => {
    const snapshot = buildLibraryFilesSessionSnapshot({
      activeSearchQuery: 'warm',
      currentFolderId: 'folder-anthems',
      librarySearchQuery: 'warm',
      scrollOffsetY: 96,
      searchScope: 'current-folder',
      sortMode: 'name',
    });

    assert.equal(
      shouldCaptureLibraryFilesSession({
        currentView: 'tracks',
        previousView: 'files',
      }),
      true,
    );
    assert.equal(
      shouldCaptureLibraryFilesSession({
        currentView: 'files',
        previousView: 'files',
      }),
      false,
    );
    assert.equal(
      shouldRestoreLibraryFilesSession({
        currentView: 'files',
        previousView: 'tracks',
        snapshot,
      }),
      true,
    );
    assert.equal(
      shouldRestoreLibraryFilesSession({
        currentView: 'files',
        previousView: 'tracks',
        snapshot: null,
      }),
      false,
    );
    assert.equal(
      shouldRestoreLibraryFilesSession({
        currentView: 'playlists',
        previousView: 'tracks',
        snapshot,
      }),
      false,
    );
  });
});
