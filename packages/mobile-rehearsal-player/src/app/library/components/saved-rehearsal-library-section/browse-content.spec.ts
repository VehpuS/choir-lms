import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import {
  shouldRenderFilesExplorer,
  shouldRenderFilesLoopBuilder,
  shouldRenderSavedLibraryBrowseContent,
  shouldRenderSavedTagsList,
} from './browse-content-model';

const SOURCE = {
  availability: {
    status: 'available' as const,
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  driveFileId: 'drive-file-1',
  durationMs: 245000,
  id: 'source-1',
  mimeType: 'audio/mpeg',
  name: 'Full Choir.mp3',
  provider: 'google-drive' as const,
};

describe('shouldRenderFilesLoopBuilder', () => {
  it('keeps Files browse content mounted while the search panel is open before a query is submitted', () => {
    assert.equal(
      shouldRenderSavedLibraryBrowseContent({
        detailMode: 'browse',
        isSearchPanelVisible: true,
        isSearchResultsVisible: false,
        selectedView: 'files',
      }),
      true,
    );
    assert.equal(
      shouldRenderSavedLibraryBrowseContent({
        detailMode: 'browse',
        isSearchPanelVisible: true,
        isSearchResultsVisible: false,
        selectedView: 'tracks',
      }),
      false,
    );
  });

  it('keeps Files search inside the explorer surface', () => {
    assert.equal(shouldRenderFilesExplorer('files'), true);
    assert.equal(shouldRenderFilesExplorer('tracks'), false);
  });

  it('renders the Tags list only for the Tags view', () => {
    assert.equal(shouldRenderSavedTagsList('tags'), true);
    assert.equal(shouldRenderSavedTagsList('files'), false);
    assert.equal(shouldRenderSavedTagsList('tracks'), false);
  });

  it('keeps the loop builder mounted when Files starts a loop from a selected track', () => {
    assert.equal(
      shouldRenderFilesLoopBuilder({
        activeLibrarySearchQuery: null,
        selectedTrack: createTrackPlayableItem(SOURCE),
        selectedView: 'files',
      }),
      true,
    );
  });

  it('does not mount the loop builder helper outside the Files-at-rest path', () => {
    assert.equal(
      shouldRenderFilesLoopBuilder({
        activeLibrarySearchQuery: 'lightning',
        selectedTrack: createTrackPlayableItem(SOURCE),
        selectedView: 'files',
      }),
      false,
    );
    assert.equal(
      shouldRenderFilesLoopBuilder({
        activeLibrarySearchQuery: null,
        selectedTrack: null,
        selectedView: 'tracks',
      }),
      false,
    );
  });
});
