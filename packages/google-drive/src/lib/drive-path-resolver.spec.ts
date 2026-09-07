import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  resolveDriveFilePaths,
  type DriveFileMetadata,
} from './google-drive.js';

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const ORIGINAL_FETCH = globalThis.fetch;

const createFile = (
  id: string,
  parents: string[],
  shared = false,
): DriveFileMetadata => {
  return {
    id,
    name: `${id}.mp3`,
    mimeType: 'audio/mpeg',
    parents,
    shared,
  };
};

const createFolder = (
  id: string,
  name: string,
  parents: string[],
  shared = false,
): DriveFileMetadata => {
  return {
    id,
    name,
    mimeType: FOLDER_MIME_TYPE,
    parents,
    shared,
  };
};

const getRequestedFileId = (input: string | URL | Request) => {
  const pathnameParts = new URL(String(input)).pathname.split('/');
  return decodeURIComponent(pathnameParts.at(-1) ?? '');
};

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('resolveDriveFilePaths', () => {
  it('returns a root-to-parent path for a file in My Drive', async () => {
    const requestedUrls: string[] = [];
    const folders = new Map([
      [
        'movement-folder',
        createFolder('movement-folder', 'Movement I', ['choir-folder']),
      ],
      ['choir-folder', createFolder('choir-folder', 'Choir scores', ['root'])],
    ]);

    globalThis.fetch = async (input) => {
      requestedUrls.push(String(input));
      const folder = folders.get(getRequestedFileId(input));
      assert.ok(folder);
      return Response.json(folder);
    };

    const paths = await resolveDriveFilePaths({
      accessToken: 'drive-token',
      files: [createFile('track', ['movement-folder'])],
    });

    assert.deepEqual(paths.get('track'), {
      rootKind: 'my-drive',
      path: [
        { id: 'choir-folder', name: 'Choir scores' },
        { id: 'movement-folder', name: 'Movement I' },
      ],
    });
    assert.equal(requestedUrls.length, 2);
    assert.ok(
      new URL(requestedUrls[0] ?? '').searchParams
        .get('fields')
        ?.includes('parents'),
    );
  });

  it('returns the deepest accessible path for a shared file', async () => {
    globalThis.fetch = async (input) => {
      const fileId = getRequestedFileId(input);

      if (fileId === 'accessible-folder') {
        return Response.json(
          createFolder(
            'accessible-folder',
            'Accessible folder',
            ['hidden-ancestor'],
            true,
          ),
        );
      }

      return Response.json(
        { error: { message: 'Folder is not accessible' } },
        { status: 403 },
      );
    };

    const paths = await resolveDriveFilePaths({
      accessToken: 'drive-token',
      files: [createFile('shared-track', ['accessible-folder'], true)],
    });

    assert.deepEqual(paths.get('shared-track'), {
      rootKind: 'shared',
      path: [{ id: 'accessible-folder', name: 'Accessible folder' }],
    });
  });

  it('bounds concurrent reads and reuses repeated ancestor metadata', async () => {
    const files = Array.from({ length: 6 }, (_, index) => {
      return createFile(`track-${index}`, [`folder-${index}`], true);
    });
    const requestCounts = new Map<string, number>();
    let activeRequests = 0;
    let peakActiveRequests = 0;

    globalThis.fetch = async (input) => {
      const fileId = getRequestedFileId(input);
      requestCounts.set(fileId, (requestCounts.get(fileId) ?? 0) + 1);
      activeRequests += 1;
      peakActiveRequests = Math.max(peakActiveRequests, activeRequests);
      await new Promise((resolve) => setTimeout(resolve, 0));
      activeRequests -= 1;

      if (fileId === 'shared-ancestor') {
        return Response.json(createFolder(fileId, 'Shared ancestor', [], true));
      }

      return Response.json(
        createFolder(fileId, fileId, ['shared-ancestor'], true),
      );
    };

    const paths = await resolveDriveFilePaths({
      accessToken: 'drive-token',
      files,
      concurrency: 2,
    });

    assert.equal(paths.size, files.length);
    assert.equal(peakActiveRequests, 2);
    assert.equal(requestCounts.get('shared-ancestor'), 1);
  });

  it('uses the first accessible parent when metadata lists multiple parents', async () => {
    const requestedFileIds: string[] = [];

    globalThis.fetch = async (input) => {
      const fileId = getRequestedFileId(input);
      requestedFileIds.push(fileId);

      if (fileId === 'inaccessible-parent') {
        return Response.json({}, { status: 404 });
      }

      return Response.json(
        createFolder('accessible-parent', 'Accessible parent', ['root']),
      );
    };

    const paths = await resolveDriveFilePaths({
      accessToken: 'drive-token',
      files: [
        createFile('track', [
          'inaccessible-parent',
          'accessible-parent',
          'unused-parent',
        ]),
      ],
    });

    assert.deepEqual(requestedFileIds, [
      'inaccessible-parent',
      'accessible-parent',
    ]);
    assert.deepEqual(paths.get('track')?.path, [
      { id: 'accessible-parent', name: 'Accessible parent' },
    ]);
  });

  it('stops path traversal when ancestor metadata contains a cycle', async () => {
    globalThis.fetch = async (input) => {
      const fileId = getRequestedFileId(input);

      if (fileId === 'folder-a') {
        return Response.json(
          createFolder('folder-a', 'Folder A', ['folder-b']),
        );
      }

      return Response.json(createFolder('folder-b', 'Folder B', ['folder-a']));
    };

    const paths = await resolveDriveFilePaths({
      accessToken: 'drive-token',
      files: [createFile('track', ['folder-a'])],
    });

    assert.deepEqual(paths.get('track')?.path, [
      { id: 'folder-b', name: 'Folder B' },
      { id: 'folder-a', name: 'Folder A' },
    ]);
  });
});
