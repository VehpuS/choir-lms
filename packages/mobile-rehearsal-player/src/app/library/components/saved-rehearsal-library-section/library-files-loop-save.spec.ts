import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NamedLoop } from '@org/audio-library-models';

import { saveLoopWithFilesLocation } from './library-files-loop-save';

const LOOP: NamedLoop = {
  createdAt: '2026-07-19T00:00:00.000Z',
  endMs: 20000,
  id: 'loop-1',
  name: 'Folder loop',
  ownerId: 'user-1',
  sourceId: 'source-1',
  sourceName: 'Full Choir.mp3',
  startMs: 10000,
  updatedAt: '2026-07-19T00:00:00.000Z',
};

const createFilesController = (currentFolderId: string) => {
  const movedFolders: string[] = [];

  return {
    files: {
      explorer: {
        breadcrumbs: [],
        currentFolder: {
          createdAt: '2026-05-10T10:00:00.000Z',
          id: currentFolderId,
          name:
            currentFolderId === 'folder:library-root' ? 'Library' : 'Warmups',
          parentFolderId: null,
        },
        rows: [],
      },
      moveFileLink: async (options: {
        destinationFolderId: string;
        fileLink: {
          entityId: string;
          entityKind: 'loop';
          id: string;
          parentFolderId: string;
        };
      }) => {
        assert.equal(options.fileLink.entityId, LOOP.id);
        assert.equal(options.fileLink.entityKind, 'loop');
        assert.equal(options.fileLink.id, `file-link:loop:${LOOP.id}`);
        assert.equal(options.fileLink.parentFolderId, 'folder:library-root');
        movedFolders.push(options.destinationFolderId);
        return {
          didComplete: true,
          issue: null,
        };
      },
      rootFolderId: 'folder:library-root',
    },
    movedFolders,
  };
};

describe('saveLoopWithFilesLocation', () => {
  it('moves a newly saved loop default link to the current non-root Files folder', async () => {
    const { files, movedFolders } = createFilesController('folder-warmups');
    const feedbackMessages: string[] = [];
    const savedLoopIds: string[] = [];

    const didSave = await saveLoopWithFilesLocation({
      detailMode: 'browse',
      isEditingLoop: false,
      isSearchPanelVisible: false,
      libraryFiles: files,
      loop: LOOP,
      onShowFilesSuccessFeedback: (feedback) => {
        feedbackMessages.push(`${feedback.title}: ${feedback.message}`);
      },
      saveLoop: async (loop) => {
        savedLoopIds.push(loop.id);
        return true;
      },
      selectedView: 'files',
    });

    assert.equal(didSave, true);
    assert.deepEqual(savedLoopIds, [LOOP.id]);
    assert.deepEqual(movedFolders, ['folder-warmups']);
    assert.deepEqual(feedbackMessages, [
      'Loop saved: Folder loop was saved in Warmups.',
    ]);
  });

  it('does not create extra file links when editing an existing loop', async () => {
    const { files, movedFolders } = createFilesController('folder-warmups');

    const didSave = await saveLoopWithFilesLocation({
      detailMode: 'browse',
      isEditingLoop: true,
      isSearchPanelVisible: false,
      libraryFiles: files,
      loop: LOOP,
      saveLoop: async () => true,
      selectedView: 'files',
    });

    assert.equal(didSave, true);
    assert.deepEqual(movedFolders, []);
  });

  it('leaves root-folder saves on the default root file link path', async () => {
    const { files, movedFolders } = createFilesController(
      'folder:library-root',
    );
    const feedbackMessages: string[] = [];

    const didSave = await saveLoopWithFilesLocation({
      detailMode: 'browse',
      isEditingLoop: false,
      isSearchPanelVisible: false,
      libraryFiles: files,
      loop: LOOP,
      onShowFilesSuccessFeedback: (feedback) => {
        feedbackMessages.push(`${feedback.title}: ${feedback.message}`);
      },
      saveLoop: async () => true,
      selectedView: 'files',
    });

    assert.equal(didSave, true);
    assert.deepEqual(movedFolders, []);
    assert.deepEqual(feedbackMessages, [
      'Loop saved: Folder loop was saved in Library.',
    ]);
  });
});
