import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLibraryFilesSessionSnapshot,
  resolveLibraryFilesSessionTransition,
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

  it('captures and restores the full Files session contract across view switches', () => {
    const capturedTransition = resolveLibraryFilesSessionTransition({
      activeSearchQuery: 'alto entrance',
      currentFolderId: 'folder-warmups',
      currentView: 'tracks',
      filesSearchScope: 'all-files',
      filesSortMode: 'date-opened',
      librarySearchQuery: 'alto entrance ',
      previousView: 'files',
      scrollOffsetY: 184,
      snapshot: null,
    });

    assert.deepEqual(capturedTransition, {
      nextSnapshot: {
        activeSearchQuery: 'alto entrance',
        currentFolderId: 'folder-warmups',
        librarySearchQuery: 'alto entrance ',
        scrollOffsetY: 184,
        searchScope: 'all-files',
        sortMode: 'date-opened',
      },
      restoredSnapshot: null,
      scrollOffsetYToRestore: null,
    });

    const restoredTransition = resolveLibraryFilesSessionTransition({
      activeSearchQuery: null,
      currentFolderId: null,
      currentView: 'files',
      filesSearchScope: 'current-folder',
      filesSortMode: 'name',
      librarySearchQuery: '',
      previousView: 'playlists',
      scrollOffsetY: 0,
      snapshot: capturedTransition.nextSnapshot,
    });

    assert.deepEqual(restoredTransition, {
      nextSnapshot: capturedTransition.nextSnapshot,
      restoredSnapshot: capturedTransition.nextSnapshot,
      scrollOffsetYToRestore: 184,
    });
  });
});
