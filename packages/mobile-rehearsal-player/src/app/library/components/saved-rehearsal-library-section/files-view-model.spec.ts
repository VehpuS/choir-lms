import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLoopPlayableItem } from '@org/audio-library-models';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import { buildFilesBreadcrumbs, isRowPreparingLoop } from './files-view-model';
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
    supportingLabel: '4:05',
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
    supportingLabel: `0:12–0:24 · 0:12 · ${SOURCE.name}`,
  };
  const folderRow: LibraryFilesRow = {
    childCount: 0,
    folder: {
      id: 'folder-warmups',
      name: 'Warmups',
      parentFolderId: 'folder:library-root',
      createdAt: '2026-05-10T10:00:00.000Z',
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

describe('buildFilesBreadcrumbs', () => {
  const files = {
    goToFolder: (folderId: string) => {
      visitedFolderIds.push(folderId);
    },
  };
  let visitedFolderIds: string[] = [];

  it('is empty at the Library root, where it would repeat the title', () => {
    assert.deepEqual(
      buildFilesBreadcrumbs(
        {
          breadcrumbs: [{ folderId: 'folder:library-root', label: 'Library' }],
        },
        files,
      ),
      [],
    );
  });

  it('ends on the current folder as a non-interactive segment', () => {
    visitedFolderIds = [];
    const breadcrumbs = buildFilesBreadcrumbs(
      {
        breadcrumbs: [
          { folderId: 'folder:library-root', label: 'Library' },
          { folderId: 'folder-season', label: 'Season' },
          { folderId: 'folder-advent', label: 'Advent 2026' },
        ],
      },
      files,
    );

    assert.deepEqual(
      breadcrumbs.map((breadcrumb) => [breadcrumb.label, breadcrumb.isCurrent]),
      [
        ['Library', false],
        ['Season', false],
        ['Advent 2026', true],
      ],
    );
    assert.equal(breadcrumbs[2]?.onPress, undefined);

    breadcrumbs[1]?.onPress?.();

    assert.deepEqual(visitedFolderIds, ['folder-season']);
  });
});
