import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  NamedLoop,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import type { RehearsalLibraryTagMatch } from '@org/audio-library-runtime';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
  UNSUPPORTED_SOURCE,
} from '../../../test-utils/library-test-fixtures.js';
import { buildTrackOnlyWarmupsPlaylist } from '../../playlists/utils/saved-playlist-test-fixtures.js';
import { resolveTagQueuePlayableItems } from './tag-queue-playback.js';

const TENOR_SOURCE = {
  ...PLAYABLE_SOURCE,
  id: 'drive:tenor-line',
  name: 'Tenor Line.mp3',
};

const TAGGED_FOLDER: RehearsalLibraryFolderNode = {
  id: 'folder:warmups',
  name: 'Warmups',
  parentFolderId: null,
  createdAt: '2026-05-10T00:00:00.000Z',
};

const FILE_LINK_TENOR_IN_FOLDER: RehearsalLibraryFileLinkNode = {
  id: 'file-link:tenor',
  parentFolderId: TAGGED_FOLDER.id,
  entityKind: 'track',
  entityId: TENOR_SOURCE.id,
};

describe('resolveTagQueuePlayableItems', () => {
  it('resolves a direct track match', () => {
    const matches: RehearsalLibraryTagMatch[] = [
      { kind: 'track', item: PLAYABLE_SOURCE },
    ];

    const result = resolveTagQueuePlayableItems(matches, {
      fileLinks: [],
      folders: [],
      loops: [],
      sources: [PLAYABLE_SOURCE],
    });

    assert.deepEqual(
      result.map((item) => item.id),
      [`track:${PLAYABLE_SOURCE.id}`],
    );
  });

  it('excludes a direct track match whose source is unavailable', () => {
    const matches: RehearsalLibraryTagMatch[] = [
      { kind: 'track', item: UNSUPPORTED_SOURCE },
    ];

    const result = resolveTagQueuePlayableItems(matches, {
      fileLinks: [],
      folders: [],
      loops: [],
      sources: [UNSUPPORTED_SOURCE],
    });

    assert.deepEqual(result, []);
  });

  it('resolves a direct loop match using its parent source', () => {
    const matches: RehearsalLibraryTagMatch[] = [
      { kind: 'loop', item: SAVED_LOOP as NamedLoop },
    ];

    const result = resolveTagQueuePlayableItems(matches, {
      fileLinks: [],
      folders: [],
      loops: [SAVED_LOOP as NamedLoop],
      sources: [PLAYABLE_SOURCE],
    });

    assert.deepEqual(
      result.map((item) => item.id),
      [`loop:${SAVED_LOOP.id}`],
    );
  });

  it('excludes a loop match whose parent source is missing from the collection', () => {
    const matches: RehearsalLibraryTagMatch[] = [
      { kind: 'loop', item: SAVED_LOOP as NamedLoop },
    ];

    const result = resolveTagQueuePlayableItems(matches, {
      fileLinks: [],
      folders: [],
      loops: [SAVED_LOOP as NamedLoop],
      sources: [],
    });

    assert.deepEqual(result, []);
  });

  it('resolves a playlist match into its contained items, in playlist order', () => {
    const playlist = buildTrackOnlyWarmupsPlaylist();
    const matches: RehearsalLibraryTagMatch[] = [
      { kind: 'playlist', item: playlist },
    ];

    const result = resolveTagQueuePlayableItems(matches, {
      fileLinks: [],
      folders: [],
      loops: [],
      sources: [PLAYABLE_SOURCE],
    });

    assert.deepEqual(
      result.map((item) => item.id),
      [`track:${PLAYABLE_SOURCE.id}`],
    );
  });

  it('resolves a folder match into every track/loop reachable from it', () => {
    const matches: RehearsalLibraryTagMatch[] = [
      { kind: 'folder', item: TAGGED_FOLDER },
    ];

    const result = resolveTagQueuePlayableItems(matches, {
      fileLinks: [FILE_LINK_TENOR_IN_FOLDER],
      folders: [TAGGED_FOLDER],
      loops: [],
      sources: [TENOR_SOURCE],
    });

    assert.deepEqual(
      result.map((item) => item.id),
      [`track:${TENOR_SOURCE.id}`],
    );
  });

  it('queues a track exactly once when reachable both directly and via a tagged folder', () => {
    const matches: RehearsalLibraryTagMatch[] = [
      { kind: 'track', item: TENOR_SOURCE },
      { kind: 'folder', item: TAGGED_FOLDER },
    ];

    const result = resolveTagQueuePlayableItems(matches, {
      fileLinks: [FILE_LINK_TENOR_IN_FOLDER],
      folders: [TAGGED_FOLDER],
      loops: [],
      sources: [TENOR_SOURCE],
    });

    assert.deepEqual(
      result.map((item) => item.id),
      [`track:${TENOR_SOURCE.id}`],
    );
  });

  it('returns an empty list for an empty match list', () => {
    const result = resolveTagQueuePlayableItems([], {
      fileLinks: [],
      folders: [],
      loops: [],
      sources: [],
    });

    assert.deepEqual(result, []);
  });
});
