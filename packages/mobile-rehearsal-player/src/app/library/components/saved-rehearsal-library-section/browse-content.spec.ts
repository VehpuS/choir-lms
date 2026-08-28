import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import {
  resolveFreshEntityForTagEditor,
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

describe('resolveFreshEntityForTagEditor', () => {
  it('resolves the current entity by id, not whatever stale copy the caller already holds', () => {
    // Regression coverage for the tag-persistence audit bug: the Files
    // explorer tree caches its own copy of each row's entity, which does not
    // refresh on a tags-only save (see `use-library-files.ts`). Opening the
    // tag editor from a Files row must look the entity up fresh by id from
    // the reactive saved-library list instead of trusting that stale copy,
    // or the editor reopens showing the tags from before the last save.
    const staleSource = { ...SOURCE, tags: [] };
    const freshSources = [{ ...SOURCE, tags: ['Alto'] }];

    assert.deepEqual(
      resolveFreshEntityForTagEditor(freshSources, staleSource.id),
      { ...SOURCE, tags: ['Alto'] },
    );
  });

  it('returns null when the entity is no longer present in the fresh list', () => {
    assert.equal(
      resolveFreshEntityForTagEditor([{ id: SOURCE.id }], 'missing-id'),
      null,
    );
  });
});
