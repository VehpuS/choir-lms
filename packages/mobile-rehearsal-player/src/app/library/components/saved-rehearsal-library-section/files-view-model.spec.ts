import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLoopPlayableItem } from '@org/audio-library-models';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import { isRowPreparingLoop } from './files-view-model';
import { LOOP, SOURCE } from './files-row-actions-test-helpers';

describe('isRowPreparingLoop', () => {
  const trackRow: LibraryFilesRow = {
    fileLink: {
      entityId: SOURCE.id,
      entityKind: 'track',
      id: `file-link:track:${SOURCE.id}`,
      parentFolderId: 'folder:library-root',
    },
    isPlayable: true,
    kind: 'track',
    label: SOURCE.name,
    source: SOURCE,
    supportingLabel: 'Track • 4:05',
  };
  const loopRow: LibraryFilesRow = {
    fileLink: {
      entityId: LOOP.id,
      entityKind: 'loop',
      id: `file-link:loop:${LOOP.id}`,
      parentFolderId: 'folder:library-root',
    },
    kind: 'loop',
    label: LOOP.name,
    loop: LOOP,
    playableItem: createLoopPlayableItem(LOOP, SOURCE),
    source: SOURCE,
    supportingLabel: `${SOURCE.name} • 0:12 to 0:24`,
  };
  const folderRow: LibraryFilesRow = {
    childCount: 0,
    folder: {
      id: 'folder-warmups',
      name: 'Warmups',
      parentFolderId: 'folder:library-root',
    },
    kind: 'folder',
    label: 'Warmups',
    supportingLabel: '0 items',
  };

  it('is false when no loop builder preparation is pending', () => {
    assert.equal(isRowPreparingLoop(null, trackRow), false);
    assert.equal(isRowPreparingLoop(null, loopRow), false);
  });

  it('matches a track row only when its source is the pending one', () => {
    assert.equal(isRowPreparingLoop(SOURCE.id, trackRow), true);
    assert.equal(isRowPreparingLoop('drive-file-other', trackRow), false);
  });

  it("matches a loop row by its parent track's source id", () => {
    assert.equal(isRowPreparingLoop(SOURCE.id, loopRow), true);
    assert.equal(isRowPreparingLoop('drive-file-other', loopRow), false);
  });

  it('is always false for row kinds without a loop-builder source, such as folders', () => {
    assert.equal(isRowPreparingLoop(SOURCE.id, folderRow), false);
  });
});
