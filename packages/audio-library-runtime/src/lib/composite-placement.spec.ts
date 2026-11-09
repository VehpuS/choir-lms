import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RehearsalLibraryFileTree } from '@org/audio-library-models';

import {
  createCompositeFileLink,
  resolveCompositeFolderId,
} from './composite-placement.ts';

const tree: RehearsalLibraryFileTree = {
  version: 1,
  rootFolderId: 'root',
  folders: [],
  fileLinks: [
    { id: 'l1', parentFolderId: 'root', entityKind: 'track', entityId: 'a' },
    { id: 'l2', parentFolderId: 'ubi', entityKind: 'track', entityId: 'b' },
    { id: 'l3', parentFolderId: 'other', entityKind: 'loop', entityId: 'c' },
  ],
};

describe('resolveCompositeFolderId', () => {
  it("uses the folder of the first stem's track", () => {
    assert.equal(resolveCompositeFolderId(tree, ['b', 'a']), 'ubi');
  });

  it('skips a stem with no file and falls back to the root', () => {
    assert.equal(resolveCompositeFolderId(tree, ['gone', 'b']), 'ubi');
    assert.equal(resolveCompositeFolderId(tree, ['gone']), 'root');
    assert.equal(resolveCompositeFolderId(tree, []), 'root');
  });

  it('does not take a loop with the same id as a track', () => {
    assert.equal(resolveCompositeFolderId(tree, ['c']), 'root');
  });
});

describe('createCompositeFileLink', () => {
  it('builds the link the tree sync would create, in the chosen folder', () => {
    assert.deepEqual(createCompositeFileLink({ id: 'c1' }, 'ubi'), {
      id: 'file-link:composite:c1',
      parentFolderId: 'ubi',
      entityKind: 'composite',
      entityId: 'c1',
    });
  });
});
