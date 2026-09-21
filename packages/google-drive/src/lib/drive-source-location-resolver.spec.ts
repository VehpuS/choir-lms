import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  resolveCurrentDriveSourceLocation,
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

describe('resolveCurrentDriveSourceLocation', () => {
  it('resolves the current accessible parent and root-to-parent path in My Drive', async () => {
    const metadataById = new Map([
      ['track', createFile('track', ['movement-folder'])],
      [
        'movement-folder',
        createFolder('movement-folder', 'Movement I', ['choir-folder']),
      ],
      ['choir-folder', createFolder('choir-folder', 'Choir scores', ['root'])],
    ]);

    globalThis.fetch = async (input) => {
      const file = metadataById.get(getRequestedFileId(input));
      assert.ok(file);
      return Response.json(file);
    };

    const result = await resolveCurrentDriveSourceLocation({
      accessToken: 'drive-token',
      driveFileId: 'track',
    });

    assert.deepEqual(result, {
      status: 'resolved',
      location: {
        rootKind: 'my-drive',
        parentFolderId: 'movement-folder',
        parentFolderName: 'Movement I',
        path: [
          { id: 'choir-folder', name: 'Choir scores' },
          { id: 'movement-folder', name: 'Movement I' },
        ],
      },
    });
  });

  it('reflects a renamed ancestor and a shared root kind', async () => {
    const metadataById = new Map([
      ['track', createFile('track', ['shared-folder'], true)],
      [
        'shared-folder',
        createFolder('shared-folder', 'Renamed shared folder', [], true),
      ],
    ]);

    globalThis.fetch = async (input) => {
      const file = metadataById.get(getRequestedFileId(input));
      assert.ok(file);
      return Response.json(file);
    };

    const result = await resolveCurrentDriveSourceLocation({
      accessToken: 'drive-token',
      driveFileId: 'track',
    });

    assert.deepEqual(result, {
      status: 'resolved',
      location: {
        rootKind: 'shared',
        parentFolderId: 'shared-folder',
        parentFolderName: 'Renamed shared folder',
        path: [{ id: 'shared-folder', name: 'Renamed shared folder' }],
      },
    });
  });

  it('resolves the deepest accessible parent when an ancestor is inaccessible', async () => {
    const metadataById = new Map([
      ['track', createFile('track', ['accessible-folder'], true)],
      [
        'accessible-folder',
        createFolder(
          'accessible-folder',
          'Accessible folder',
          ['hidden-ancestor'],
          true,
        ),
      ],
    ]);

    globalThis.fetch = async (input) => {
      const fileId = getRequestedFileId(input);
      const file = metadataById.get(fileId);

      if (file) {
        return Response.json(file);
      }

      return Response.json(
        { error: { message: 'Folder is not accessible' } },
        { status: 403 },
      );
    };

    const result = await resolveCurrentDriveSourceLocation({
      accessToken: 'drive-token',
      driveFileId: 'track',
    });

    assert.deepEqual(result, {
      status: 'resolved',
      location: {
        rootKind: 'shared',
        parentFolderId: 'accessible-folder',
        parentFolderName: 'Accessible folder',
        path: [{ id: 'accessible-folder', name: 'Accessible folder' }],
      },
    });
  });

  it('reports a deleted file as unresolved without throwing', async () => {
    globalThis.fetch = async () => {
      return Response.json(
        { error: { message: 'File not found' } },
        {
          status: 404,
        },
      );
    };

    const result = await resolveCurrentDriveSourceLocation({
      accessToken: 'drive-token',
      driveFileId: 'missing-track',
    });

    assert.deepEqual(result, { status: 'unresolved', reason: 'missing' });
  });

  it('reports an authorization failure as unresolved', async () => {
    globalThis.fetch = async () => {
      return Response.json(
        { error: { message: 'Invalid credentials' } },
        {
          status: 401,
        },
      );
    };

    const result = await resolveCurrentDriveSourceLocation({
      accessToken: 'expired-token',
      driveFileId: 'track',
    });

    assert.deepEqual(result, {
      status: 'unresolved',
      reason: 'authorization-required',
    });
  });

  it('reports a file with no accessible parent as unresolved', async () => {
    globalThis.fetch = async () => {
      return Response.json(createFile('root-level-track', []));
    };

    const result = await resolveCurrentDriveSourceLocation({
      accessToken: 'drive-token',
      driveFileId: 'root-level-track',
    });

    assert.deepEqual(result, {
      status: 'unresolved',
      reason: 'no-accessible-parent',
    });
  });

  it('reports an unclassified ancestor lookup failure as unresolved instead of throwing', async () => {
    const metadataById = new Map([
      ['track', createFile('track', ['unstable-folder'])],
    ]);

    globalThis.fetch = async (input) => {
      const fileId = getRequestedFileId(input);
      const file = metadataById.get(fileId);

      if (file) {
        return Response.json(file);
      }

      return Response.json(
        { error: { message: 'Drive is temporarily unavailable' } },
        { status: 500 },
      );
    };

    const result = await resolveCurrentDriveSourceLocation({
      accessToken: 'drive-token',
      driveFileId: 'track',
    });

    assert.deepEqual(result, { status: 'unresolved', reason: 'unknown' });
  });

  it('propagates cancellation instead of reporting it as unresolved', async () => {
    const controller = new AbortController();

    globalThis.fetch = async (_input, init) => {
      const signal = init?.signal as AbortSignal | undefined;

      if (signal?.aborted) {
        const abortError = new Error('The operation was aborted.');
        abortError.name = 'AbortError';
        throw abortError;
      }

      return Response.json(createFile('track', ['movement-folder']));
    };

    controller.abort();

    await assert.rejects(
      resolveCurrentDriveSourceLocation({
        accessToken: 'drive-token',
        driveFileId: 'track',
        signal: controller.signal,
      }),
      (error: unknown) => error instanceof Error && error.name === 'AbortError',
    );
  });
});
