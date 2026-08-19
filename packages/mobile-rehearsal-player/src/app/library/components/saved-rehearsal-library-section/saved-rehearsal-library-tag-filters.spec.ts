import type { NamedLoop, Playlist } from '@org/audio-library-models';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { resolveAvailableTagFilters } from './saved-rehearsal-library-tag-filters';

describe('resolveAvailableTagFilters', () => {
  it('dedupes tags across sources, loops, and playlists case-insensitively', () => {
    const availableTagFilters = resolveAvailableTagFilters({
      savedLibrarySources: [
        { tags: [' Soprano ', 'Warmup'] } as unknown as DriveLibrarySource,
      ],
      savedLoops: [{ tags: ['soprano'] } as unknown as NamedLoop],
      savedPlaylists: [{ tags: ['Alto'] } as unknown as Playlist],
    });

    assert.deepEqual(availableTagFilters, ['Alto', 'Soprano', 'Warmup']);
  });

  it('ignores blank and whitespace-only tags', () => {
    const availableTagFilters = resolveAvailableTagFilters({
      savedLibrarySources: [
        { tags: ['  ', ''] } as unknown as DriveLibrarySource,
      ],
      savedLoops: [],
      savedPlaylists: [],
    });

    assert.deepEqual(availableTagFilters, []);
  });

  it('returns an empty array when nothing carries a tag', () => {
    const availableTagFilters = resolveAvailableTagFilters({
      savedLibrarySources: [],
      savedLoops: [],
      savedPlaylists: [],
    });

    assert.deepEqual(availableTagFilters, []);
  });
});
