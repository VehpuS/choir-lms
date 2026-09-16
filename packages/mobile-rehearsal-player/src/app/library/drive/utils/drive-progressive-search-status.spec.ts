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
    assert.equal(copy.title, 'Loading more results');
    assert.equal(
      copy.message,
      '1 matching folder shown so far. Complete Drive discovery is still in progress.',
    );
  });
});
