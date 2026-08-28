import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model.js';
import { buildCanonicalIdsKey } from './use-library-files.js';

const SOURCE: DriveLibrarySource = {
  availability: { status: 'available' },
  createdAt: '2026-05-10T10:00:00.000Z',
  driveFileId: 'drive-file-1',
  id: 'drive:drive-file-1',
  mimeType: 'audio/mpeg',
  name: 'Full Choir.mp3',
  provider: 'google-drive',
};

describe('buildCanonicalIdsKey', () => {
  it('changes when an entity keeps its id but gains or loses tags', () => {
    // Regression coverage: this key gates the Files-tree `refresh()` effect
    // in `useLibraryFiles`. If it only tracked ids, a tags-only save would
    // never re-fire that effect, leaving stale-looking Files data behind.
    const beforeTagging = buildCanonicalIdsKey({
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [{ ...SOURCE, tags: [] }],
    });
    const afterTagging = buildCanonicalIdsKey({
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [{ ...SOURCE, tags: ['Alto'] }],
    });

    assert.notEqual(beforeTagging, afterTagging);
  });

  it('stays the same when neither ids nor tags change', () => {
    const options = {
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [{ ...SOURCE, tags: ['Alto'] }],
    };

    assert.equal(buildCanonicalIdsKey(options), buildCanonicalIdsKey(options));
  });

  it('still changes when an entity is added or removed', () => {
    const oneSource = buildCanonicalIdsKey({
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [SOURCE],
    });
    const twoSources = buildCanonicalIdsKey({
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [SOURCE, { ...SOURCE, id: 'drive:drive-file-2' }],
    });

    assert.notEqual(oneSource, twoSources);
  });
});
