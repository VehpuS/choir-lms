/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AUTHORIZED_STATE,
  BROWSE_SNAPSHOT,
} from '../../../test-utils/library-test-fixtures.js';
import { getDriveLibraryStatusCopy } from './drive-library-view-model.js';

describe('progressive Drive search status', () => {
  it('identifies visible results as incomplete while loading', () => {
    const copy = getDriveLibraryStatusCopy({
      authState: AUTHORIZED_STATE,
      activeSearchQuery: 'Warmups',
      browseSnapshot: BROWSE_SNAPSHOT,
      googleAuthConfigured: true,
      isLoading: true,
      issue: null,
      searchSnapshot: {
        query: 'Warmups',
        results: [
          {
            id: 'folder-warmups',
            kind: 'folder',
            name: 'Warmups',
            rootKind: 'my-drive',
            shared: false,
          },
        ],
        playableSources: [],
        unavailableSources: [],
      },
    });

    assert.equal(copy.tone, 'neutral');
    // Progress with results is the summary line's job, not a second card.
    assert.equal(copy.title, 'Searching Google Drive');
    assert.equal(copy.message, 'Matches appear as Drive is searched.');
  });
});
