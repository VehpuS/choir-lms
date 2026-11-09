import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RehearsalLibraryFileTree } from '@org/audio-library-models';

import { resolveSaveInOptions } from './save-in-model';

const folder = (id: string, name: string, parentFolderId: string | null) => ({
  createdAt: '',
  id,
  name,
  parentFolderId,
});
const TREE: RehearsalLibraryFileTree = {
  fileLinks: [
    {
      entityId: 't2',
      entityKind: 'track',
      id: 'link-t2',
      parentFolderId: 'sets',
    },
  ],
  folders: [
    folder('root', 'Library', null),
    folder('sets', 'Sets', 'root'),
    folder('advent', 'Advent', 'sets'),
    folder('anthems', 'Anthems', 'root'),
  ],
  rootFolderId: 'root',
  version: 1,
};

describe('resolveSaveInOptions', () => {
  it('lists the root first, then the other folders by path', () => {
    const { folders } = resolveSaveInOptions(TREE, ['t2']);

    assert.deepEqual(
      folders.map(({ label }) => label),
      [
        'Library',
        'Library / Anthems',
        'Library / Sets',
        'Library / Sets / Advent',
      ],
    );
  });

  it('defaults to the folder of the first selected track with a file', () => {
    assert.equal(
      resolveSaveInOptions(TREE, ['t1', 't2']).defaultFolderId,
      'sets',
    );
  });

  it('defaults to the root when no selected track has a file', () => {
    assert.equal(resolveSaveInOptions(TREE, ['t9']).defaultFolderId, 'root');
  });
});
