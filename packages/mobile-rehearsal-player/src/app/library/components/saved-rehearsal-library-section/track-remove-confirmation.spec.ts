import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackRemoveFromLibraryConfirmation } from './library-files-delete-copy';
import { SOURCE } from './files-row-actions-test-helpers';

const NO_IMPACT = {
  adjustedTrackCount: 0,
  adjustedTrackNames: [],
  fileLinkCount: 0,
  fileLinkNames: [],
  loopCount: 0,
  loopNames: [],
  playlistEntryCount: 0,
  playlistEntryTitles: [],
};

// Task 8.27: every view that removes a track (Files, Tracks, Add) shows this
// one confirmation, so the loop, folder-link and playlist-entry impact is the
// same wherever the removal starts.
describe('createTrackRemoveFromLibraryConfirmation', () => {
  it('builds the same dialog from a bare source as from a Files row', () => {
    const fromSource = createTrackRemoveFromLibraryConfirmation(
      { source: SOURCE },
      NO_IMPACT,
    );

    assert.equal(fromSource.title, 'Remove from library?');
    assert.equal(fromSource.confirmLabel, 'Remove from library');
    assert.equal(
      fromSource.message,
      `"${SOURCE.name}" will be removed from your saved rehearsal library.`,
    );
  });

  it('lists loops, folder links, adjusted tracks and playlist entries that go with the track', () => {
    const confirmation = createTrackRemoveFromLibraryConfirmation(
      { source: SOURCE },
      {
        adjustedTrackCount: 1,
        adjustedTrackNames: ['Full Choir • +2 st'],
        fileLinkCount: 2,
        fileLinkNames: ['Library', 'Advent'],
        loopCount: 1,
        loopNames: ['Verse entrance'],
        playlistEntryCount: 1,
        playlistEntryTitles: ['Warmups: Full Choir.mp3'],
      },
    );

    assert.match(confirmation.message, /Review affected items/);
    assert.deepEqual(
      confirmation.affectedSections.map(({ title }) => title),
      [
        'Adjusted tracks (1)',
        'Saved loops (1)',
        'Folder links (2)',
        'Playlist entries (1)',
      ],
    );
  });
});
