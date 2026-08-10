import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import {
  getDeleteFromFolderConfirmationCopy,
  getTrackRemoveFromLibraryPlacementLabel,
} from './files-row-actions';
import { SOURCE } from './files-row-actions-test-helpers';
import {
  formatTrackRemoveFromLibraryImpactMessage,
  getTrackRemoveFromLibraryAffectedSections,
} from './library-files-delete-copy';

describe('Files delete and removal copy', () => {
  it('builds pointer-aware confirmation copy for Delete from folder', () => {
    const keepEntityCopy = getDeleteFromFolderConfirmationCopy({
      isLastLink: false,
      itemName: SOURCE.name,
    });
    const deleteEntityCopy = getDeleteFromFolderConfirmationCopy({
      isLastLink: true,
      itemName: SOURCE.name,
    });

    assert.equal(keepEntityCopy.title, 'Delete from folder?');
    assert.match(keepEntityCopy.message, /Only this folder link/);
    assert.equal(keepEntityCopy.confirmLabel, 'Delete from folder');

    assert.equal(deleteEntityCopy.title, 'Delete last link from folder?');
    assert.match(deleteEntityCopy.message, /last link/);
    assert.equal(deleteEntityCopy.confirmLabel, 'Delete item from library');
  });

  it('documents explicit track-level Remove from library placement', () => {
    assert.match(
      getTrackRemoveFromLibraryPlacementLabel(),
      /final destructive action/,
    );
  });

  it('summarizes track-level Remove from library dependency impact', () => {
    const row: Extract<LibraryFilesRow, { kind: 'track' }> = {
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
    const message = formatTrackRemoveFromLibraryImpactMessage(row, {
      fileLinkCount: 2,
      fileLinkNames: ['Original track link', 'Practice copy'],
      loopCount: 1,
      loopNames: ['Verse entrance'],
      playlistEntryCount: 3,
      playlistEntryTitles: [
        'Warmups: Full Choir.mp3',
        'Warmups: Verse entrance',
        'Sunday: Full Choir.mp3',
      ],
    });

    assert.match(message, /Review affected items/);
    assert.doesNotMatch(message, /Verse entrance/);
    assert.deepEqual(
      getTrackRemoveFromLibraryAffectedSections({
        fileLinkCount: 2,
        fileLinkNames: ['Original track link', 'Practice copy'],
        loopCount: 1,
        loopNames: ['Verse entrance'],
        playlistEntryCount: 3,
        playlistEntryTitles: [
          'Warmups: Full Choir.mp3',
          'Warmups: Verse entrance',
          'Sunday: Full Choir.mp3',
        ],
      }),
      [
        { items: ['Verse entrance'], title: 'Saved loops (1)' },
        {
          items: ['Original track link', 'Practice copy'],
          title: 'Folder links (2)',
        },
        {
          items: [
            'Warmups: Full Choir.mp3',
            'Warmups: Verse entrance',
            'Sunday: Full Choir.mp3',
          ],
          title: 'Playlist entries (3)',
        },
      ],
    );
  });
});
