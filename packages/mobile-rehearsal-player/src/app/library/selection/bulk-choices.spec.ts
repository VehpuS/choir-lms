import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_BULK_CHOICE_PREFERENCES,
  getBulkChoiceCounts,
  resolveBulkChoices,
  type BulkChoiceCounts,
} from './bulk-choices.js';
import type { PlaybackExpansionContext } from './playback-expansion.js';

const ask = DEFAULT_BULK_CHOICE_PREFERENCES;
const none: BulkChoiceCounts = {
  playlistLinkCount: 0,
  repeatCountWithPlaylists: 0,
  repeatCountWithoutPlaylists: 0,
};

describe('resolveBulkChoices', () => {
  it('asks nothing when nothing qualifies', () => {
    assert.deepEqual(resolveBulkChoices({ counts: none, preferences: ask }), {
      decided: { playlists: 'skip', repeats: 'keep' },
      dueQuestions: [],
      repeatCount: 0,
    });
  });

  it('asks only the playlists question when there are no repeats', () => {
    const result = resolveBulkChoices({
      counts: { ...none, playlistLinkCount: 2 },
      preferences: ask,
    });

    assert.deepEqual(result.dueQuestions, ['playlists']);
    assert.deepEqual(result.decided, { repeats: 'keep' });
  });

  it('asks only the repeats question when no folder holds a playlist link', () => {
    const result = resolveBulkChoices({
      counts: {
        ...none,
        repeatCountWithPlaylists: 3,
        repeatCountWithoutPlaylists: 3,
      },
      preferences: ask,
    });

    assert.deepEqual(result.dueQuestions, ['repeats']);
    assert.equal(result.repeatCount, 3);
  });

  it('asks both together, counting the larger possible repeat total', () => {
    const result = resolveBulkChoices({
      counts: {
        playlistLinkCount: 1,
        repeatCountWithPlaylists: 4,
        repeatCountWithoutPlaylists: 1,
      },
      preferences: ask,
    });

    assert.deepEqual(result.dueQuestions, ['playlists', 'repeats']);
    assert.equal(result.repeatCount, 4);
  });

  it('uses stored defaults without asking', () => {
    const result = resolveBulkChoices({
      counts: {
        playlistLinkCount: 1,
        repeatCountWithPlaylists: 2,
        repeatCountWithoutPlaylists: 0,
      },
      preferences: { playlistsInFolders: 'include', repeatedItems: 'remove' },
    });

    assert.deepEqual(result, {
      decided: { playlists: 'include', repeats: 'remove' },
      dueQuestions: [],
      repeatCount: 2,
    });
  });

  it('skips the repeats question when a stored skip removes the repeats', () => {
    const result = resolveBulkChoices({
      counts: {
        playlistLinkCount: 1,
        repeatCountWithPlaylists: 2,
        repeatCountWithoutPlaylists: 0,
      },
      preferences: { playlistsInFolders: 'skip', repeatedItems: 'ask' },
    });

    assert.deepEqual(result.dueQuestions, []);
    assert.equal(result.decided.repeats, 'keep');
  });

  it('ignores a stored default for a question that does not arise', () => {
    const result = resolveBulkChoices({
      counts: none,
      preferences: { playlistsInFolders: 'include', repeatedItems: 'remove' },
    });

    assert.deepEqual(result.decided, { playlists: 'skip', repeats: 'keep' });
    assert.deepEqual(result.dueQuestions, []);
  });
});

describe('getBulkChoiceCounts', () => {
  const context: PlaybackExpansionContext = {
    getFolderChildren: () => [
      { entityId: 'a', kind: 'track' },
      { entityId: 'p', kind: 'playlist' },
    ],
    getPlaylistRefs: () => [{ entityId: 'a', kind: 'track' }],
  };

  it('reports the repeat count under each playlists answer', () => {
    assert.deepEqual(
      getBulkChoiceCounts(
        [{ folderId: 'f', key: 'k', kind: 'folder' }],
        context,
      ),
      {
        playlistLinkCount: 1,
        repeatCountWithPlaylists: 1,
        repeatCountWithoutPlaylists: 0,
      },
    );
  });
});
