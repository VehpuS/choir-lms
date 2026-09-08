import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isDriveSourceLocation } from './drive-source-location.js';
import { createDriveAudioSource } from './rehearsal-domain.js';

describe('Drive source location', () => {
  it('preserves structured provenance through source construction', () => {
    const sourceLocation = {
      parentFolderId: 'folder-alto',
      parentFolderName: 'Alto',
      rootKind: 'my-drive' as const,
      path: [
        { id: 'folder-concert', name: 'Spring concert' },
        { id: 'folder-alto', name: 'Alto' },
      ],
    };

    const source = createDriveAudioSource({
      driveFileId: 'drive-file-with-location',
      name: 'Alto.mp3',
      mimeType: 'audio/mpeg',
      sourceLocation,
      availability: { status: 'available' },
    });

    assert.equal(isDriveSourceLocation(source.sourceLocation), true);
    assert.deepEqual(source.sourceLocation, sourceLocation);
  });
});
