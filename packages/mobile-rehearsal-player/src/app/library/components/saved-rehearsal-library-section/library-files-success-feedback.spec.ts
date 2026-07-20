import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLibraryFilesSuccessFeedback } from './library-files-success-feedback';

describe('createLibraryFilesSuccessFeedback', () => {
  it('builds deterministic compact feedback with optional folder navigation', () => {
    const feedback = createLibraryFilesSuccessFeedback({
      action: {
        folderId: 'folder-warmups',
        label: 'View in folder',
      },
      message: 'Full Choir.mp3 moved to Warmups.',
      title: 'Moved to folder',
    });

    assert.deepEqual(feedback, {
      action: {
        folderId: 'folder-warmups',
        label: 'View in folder',
      },
      id: 'Moved to folder:Full Choir.mp3 moved to Warmups.:folder-warmups',
      message: 'Full Choir.mp3 moved to Warmups.',
      title: 'Moved to folder',
    });
  });
});
