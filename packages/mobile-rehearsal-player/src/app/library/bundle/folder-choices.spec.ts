import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildFolderChoices } from './folder-choices';
import { libraryInput } from './bundle-test-support';

describe('buildFolderChoices', () => {
  it('lists the library root first, then folders by name with their depth', () => {
    const input = libraryInput();

    input.tree.folders.push(
      {
        id: 'a',
        name: 'Alto',
        parentFolderId: 'folder:messiah',
        createdAt: '',
      },
      {
        id: 'z',
        name: 'Zebra',
        parentFolderId: 'folder:library-root',
        createdAt: '',
      },
    );

    assert.deepEqual(
      buildFolderChoices(input.tree).map((c) => [c.name, c.depth]),
      [
        ['Library', 0],
        ['Messiah', 1],
        ['Alto', 2],
        ['Zebra', 1],
      ],
    );
  });
});
