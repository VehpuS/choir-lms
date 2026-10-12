import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldShowEmptyFolder } from './files-empty-folder-model';

describe('shouldShowEmptyFolder', () => {
  const base = { isSelecting: false, rowCount: 0, searchQuery: null };

  it('shows for a folder with no rows and no search', () => {
    assert.equal(shouldShowEmptyFolder(base), true);
  });

  it('stays hidden when the folder has rows, a search is active, or the user is selecting', () => {
    assert.equal(shouldShowEmptyFolder({ ...base, rowCount: 3 }), false);
    assert.equal(shouldShowEmptyFolder({ ...base, searchQuery: 'x' }), false);
    assert.equal(shouldShowEmptyFolder({ ...base, isSelecting: true }), false);
  });
});
