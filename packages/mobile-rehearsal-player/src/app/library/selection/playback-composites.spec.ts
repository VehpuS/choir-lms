import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type CompositeTrack,
  type Playlist,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import { appendRefsToPlaylist } from './bulk-playlist-actions';
import { expandSelectionForPlayback } from './playback-expansion';
import { createPlaybackExpansionContext } from './playback-expansion-context';
import { resolvePlaybackRefsToPlayableItems } from './playback-items';

const track = (id: string) =>
  createDriveAudioSource({
    availability: { status: 'available' },
    driveFileId: id,
    durationMs: 60_000,
    mimeType: 'audio/mpeg',
    name: id,
  });
const SOURCES = [track('t1'), track('t2')];
const COMPOSITE: CompositeTrack = {
  createdAt: '2026-11-09T10:00:00.000Z',
  defaultMix: { levels: {} },
  id: 'composite-1',
  name: 'Ubi caritas',
  presets: [],
  stems: [
    {
      id: 's1',
      mine: false,
      name: 'Soprano',
      offsetMs: 0,
      trackId: 'drive:t1',
    },
    { id: 's2', mine: false, name: 'Bass', offsetMs: 0, trackId: 'drive:t2' },
  ],
};
const TREE: RehearsalLibraryFileTree = {
  fileLinks: [
    {
      entityId: COMPOSITE.id,
      entityKind: 'composite',
      id: 'link-1',
      parentFolderId: 'root',
    },
  ],
  folders: [
    { createdAt: '', id: 'root', name: 'Library', parentFolderId: null },
  ],
  rootFolderId: 'root',
  version: 1,
};

describe('composites in bulk playback', () => {
  it('expands a folder holding a composite to one composite ref', () => {
    const context = createPlaybackExpansionContext({
      playlists: [],
      tree: TREE,
    });
    const { refs } = expandSelectionForPlayback(
      [{ folderId: 'root', key: 'root', kind: 'folder' }],
      context,
    );

    assert.deepEqual(refs, [{ entityId: 'composite-1', kind: 'composite' }]);
  });

  it('turns a composite ref into one composite item and counts a gone one', () => {
    const { playableItems, unavailableCount } =
      resolvePlaybackRefsToPlayableItems(
        [
          { entityId: 'composite-1', kind: 'composite' },
          { entityId: 'composite-gone', kind: 'composite' },
        ],
        { composites: [COMPOSITE], loops: [], sources: SOURCES },
      );

    assert.deepEqual(
      playableItems.map((item) => item.kind),
      ['composite'],
    );
    assert.equal(unavailableCount, 1);
  });

  it('appends a composite ref to a playlist as one entry', () => {
    const playlist: Playlist = {
      createdAt: '2026-11-09T10:00:00.000Z',
      id: 'playlist-1',
      items: [],
      name: 'Sunday',
      ownerId: 'user-1',
      updatedAt: '2026-11-09T10:00:00.000Z',
    };
    const result = appendRefsToPlaylist({
      playlist,
      refs: [{ entityId: 'composite-1', kind: 'composite' }],
      savedComposites: [COMPOSITE],
      savedLoops: [],
      savedSources: SOURCES,
    });

    assert.equal(result.missingCount, 0);
    assert.deepEqual(
      result.playlist?.items.map((entry) => entry.kind),
      ['composite'],
    );
  });
});
