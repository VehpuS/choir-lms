import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  CompositeTrack,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import { placeNewComposite } from './place-new-composite';

const COMPOSITE: CompositeTrack = {
  createdAt: '2026-11-09T10:00:00.000Z',
  defaultMix: { levels: {} },
  id: 'composite-1',
  name: 'Ubi caritas',
  presets: [],
  stems: [
    { id: 's1', mine: false, name: 'Soprano', offsetMs: 0, trackId: 't1' },
    { id: 's2', mine: false, name: 'Bass', offsetMs: 0, trackId: 't2' },
  ],
};

const treeWithTrackIn = (folderId: string): RehearsalLibraryFileTree => ({
  fileLinks: [
    {
      entityId: 't1',
      entityKind: 'track',
      id: 'link-t1',
      parentFolderId: folderId,
    },
  ],
  folders: [],
  rootFolderId: 'root',
  version: 1,
});

const setup = (tree: RehearsalLibraryFileTree) => {
  const saved: RehearsalLibraryFileLinkNode[] = [];

  return {
    saved,
    repository: {
      listLibraryFileTree: async () => tree,
      saveLibraryFileLink: async (
        _ownerId: string,
        fileLink: RehearsalLibraryFileLinkNode,
      ) => {
        saved.push(fileLink);
      },
    },
  };
};

describe('placeNewComposite', () => {
  it('saves the composite link in the first stem file folder', async () => {
    const { repository, saved } = setup(treeWithTrackIn('folder-sets'));

    await placeNewComposite({ composite: COMPOSITE, ownerId: 'o', repository });

    assert.deepEqual(saved, [
      {
        entityId: 'composite-1',
        entityKind: 'composite',
        id: 'file-link:composite:composite-1',
        parentFolderId: 'folder-sets',
      },
    ]);
  });

  it('leaves the composite at the root when no stem file is in a folder', async () => {
    const { repository, saved } = setup(treeWithTrackIn('root'));

    await placeNewComposite({ composite: COMPOSITE, ownerId: 'o', repository });

    assert.deepEqual(saved, []);
  });
});
