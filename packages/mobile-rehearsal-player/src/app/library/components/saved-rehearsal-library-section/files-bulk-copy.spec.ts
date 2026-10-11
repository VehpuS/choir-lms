import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BulkDeleteFromFolderPlan } from '../../saved-rehearsal-library/files-bulk-node-plans';
import {
  getBulkDeleteAcknowledgment,
  getBulkDeleteFromFolderConfirmation,
  getBulkPlacementAcknowledgment,
  getBulkRemoveFromLibraryConfirmation,
  getPlacementEntryDescription,
} from './files-bulk-copy';

const deletePlan: BulkDeleteFromFolderPlan = {
  fileLinkIds: ['a', 'b'],
  folderCount: 2,
  lastLinkCount: 1,
  lastLinkLoopCount: 0,
  lastLinkPlaylistCount: 0,
  lastLinkTrackCount: 1,
  linkCount: 2,
  selectedFolderCount: 1,
  selectedLinkCount: 1,
  topFolderIds: ['f'],
};

describe('getBulkDeleteFromFolderConfirmation', () => {
  it('sums folders and links and says how many items leave the library', () => {
    assert.deepEqual(getBulkDeleteFromFolderConfirmation(deletePlan), {
      confirmLabel: 'Delete from folder',
      message:
        'This deletes 2 folders, 2 links from library files. 1 saved item will also be removed from the library because no other folder links remain.',
      title: 'Delete from folder?',
    });
  });

  it('stays silent about the library when every item keeps another link', () => {
    const content = getBulkDeleteFromFolderConfirmation({
      ...deletePlan,
      folderCount: 0,
      lastLinkCount: 0,
      linkCount: 1,
    });

    assert.equal(content.message, 'This deletes 1 link from library files.');
  });
});

describe('getBulkRemoveFromLibraryConfirmation', () => {
  const impact = {
    adjustedTrackCount: 1,
    adjustedTrackNames: ['A fast'],
    fileLinkCount: 2,
    fileLinkNames: ['A', 'A fast'],
    loopCount: 0,
    loopNames: [],
    playlistEntryCount: 0,
    playlistEntryTitles: [],
  };

  it('lists the selection, the cascade, and the folders it leaves out', () => {
    const content = getBulkRemoveFromLibraryConfirmation({
      impact,
      names: { loops: ['Verse'], playlists: [], tracks: ['A'] },
      plan: {
        excludedFolderCount: 1,
        loopIds: ['l'],
        playlistIds: [],
        sourceIds: ['a'],
      },
    });

    assert.equal(
      content.message,
      '1 track, 1 loop will be removed from your saved rehearsal library. Review affected items before confirming. 1 selected folder will be left out; use "Delete from folder" to remove a folder.',
    );
    assert.deepEqual(
      content.affectedSections?.map(({ title }) => title),
      ['Tracks (1)', 'Loops (1)', 'Adjusted tracks (1)', 'Folder links (2)'],
    );
    assert.equal(content.confirmLabel, 'Remove from library');
  });
});

describe('placement copy', () => {
  it('describes each conflict and invalid target in one line', () => {
    const entry = {
      item: {} as never,
      itemId: 'x',
      name: 'Verse.mp3',
      status: 'conflict' as const,
    };

    assert.equal(
      getPlacementEntryDescription(entry, 'move'),
      'A move would clash with an item already named Verse.mp3.',
    );
    assert.equal(
      getPlacementEntryDescription(
        {
          ...entry,
          invalidReason: 'folder-copy-unsupported',
          status: 'invalid',
        },
        'copy',
      ),
      'Folders cannot be copied.',
    );
    assert.equal(
      getPlacementEntryDescription(
        { ...entry, invalidReason: 'folder-into-itself', status: 'invalid' },
        'move',
      ),
      'A folder cannot be moved into itself or one of its subfolders.',
    );
  });

  it('acknowledges what was placed and what was left out', () => {
    assert.deepEqual(
      getBulkPlacementAcknowledgment({
        destinationName: 'Verses',
        mode: 'move',
        placedCount: 3,
        skippedCount: 1,
      }),
      {
        message: '3 items moved to Verses. 1 item left out.',
        title: 'Moved to folder',
      },
    );
    assert.equal(
      getBulkDeleteAcknowledgment(deletePlan).message,
      '1 folder, 1 link deleted from library files.',
    );
  });
});
