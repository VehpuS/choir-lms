import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';

import {
  resolveTagEditorTagsAndTitle,
  type TagEditorTarget,
} from './use-saved-rehearsal-library-tag-editor';

const SOURCE = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'drive-file-1',
  mimeType: 'audio/mpeg',
  name: 'Full Choir.mp3',
  tags: ['Alto', 'Warmup'],
});

const LOOP: NamedLoop = {
  createdAt: '2026-05-10T00:00:00.000Z',
  endMs: 24000,
  id: 'loop-1',
  name: 'Verse entrance',
  ownerId: 'user-1',
  sourceId: SOURCE.id,
  sourceName: SOURCE.name,
  startMs: 12000,
  tags: ['Warmup'],
  updatedAt: '2026-05-10T00:00:00.000Z',
};

const PLAYLIST: Playlist = {
  createdAt: '2026-05-10T00:00:00.000Z',
  id: 'playlist-1',
  items: [],
  name: 'Morning rehearsal',
  ownerId: 'user-1',
  tags: ['Rehearsal'],
  updatedAt: '2026-05-10T00:00:00.000Z',
};

describe('resolveTagEditorTagsAndTitle', () => {
  it('resolves tags and title for a track target', () => {
    const target: TagEditorTarget = { kind: 'source', source: SOURCE };

    assert.deepEqual(resolveTagEditorTagsAndTitle(target), {
      tags: ['Alto', 'Warmup'],
      title: 'Track tags • Full Choir.mp3',
    });
  });

  it('resolves tags and title for a loop target', () => {
    const target: TagEditorTarget = { kind: 'loop', loop: LOOP };

    assert.deepEqual(resolveTagEditorTagsAndTitle(target), {
      tags: ['Warmup'],
      title: 'Loop tags • Verse entrance',
    });
  });

  it('resolves tags and title for a playlist target', () => {
    const target: TagEditorTarget = { kind: 'playlist', playlist: PLAYLIST };

    assert.deepEqual(resolveTagEditorTagsAndTitle(target), {
      tags: ['Rehearsal'],
      title: 'Playlist tags • Morning rehearsal',
    });
  });

  it('resolves tags and title for a folder target', () => {
    const target: TagEditorTarget = {
      kind: 'folder',
      folder: {
        id: 'folder-1',
        name: 'Warmups',
        parentFolderId: 'folder:library-root',
        createdAt: '2026-05-10T10:00:00.000Z',
        tags: ['Alto'],
      },
    };

    assert.deepEqual(resolveTagEditorTagsAndTitle(target), {
      tags: ['Alto'],
      title: 'Folder tags • Warmups',
    });
  });

  it('resolves an empty tags list and title when no target is selected', () => {
    assert.deepEqual(resolveTagEditorTagsAndTitle({ kind: 'none' }), {
      tags: [],
      title: '',
    });
  });

  it('defaults tags to an empty array when the target entity has none', () => {
    const target: TagEditorTarget = {
      kind: 'folder',
      folder: {
        id: 'folder-1',
        name: 'Warmups',
        parentFolderId: 'folder:library-root',
        createdAt: '2026-05-10T10:00:00.000Z',
      },
    };

    assert.deepEqual(resolveTagEditorTagsAndTitle(target).tags, []);
  });
});
