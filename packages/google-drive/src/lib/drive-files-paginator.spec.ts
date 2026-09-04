import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  paginateDriveFiles,
  type DriveFilesPage,
  type DriveFilesPageRequest,
} from './drive-files-paginator';

const createFile = (id: string) => {
  return {
    id,
    name: `${id}.mp3`,
    mimeType: 'audio/mpeg',
  };
};

const createPageRequest = (pages: DriveFilesPage[]) => {
  const requests: Parameters<DriveFilesPageRequest>[0][] = [];
  const requestPage: DriveFilesPageRequest = async (options) => {
    requests.push(options);

    const page = pages[requests.length - 1];

    if (!page) {
      throw new Error('Unexpected page request');
    }

    return page;
  };

  return { requestPage, requests };
};

describe('paginateDriveFiles', () => {
  it('returns files from a single page without requesting another page', async () => {
    const { requestPage, requests } = createPageRequest([
      { files: [createFile('file-1')] },
    ]);

    const files = await paginateDriveFiles({ requestPage });

    assert.deepEqual(files, [createFile('file-1')]);
    assert.deepEqual(requests, [{ pageToken: undefined, signal: undefined }]);
  });

  it('follows each next-page token and preserves result order', async () => {
    const { requestPage, requests } = createPageRequest([
      {
        files: [createFile('file-1')],
        nextPageToken: 'page-2',
      },
      {
        files: [createFile('file-2')],
        nextPageToken: 'page-3',
      },
      { files: [createFile('file-3')] },
    ]);

    const files = await paginateDriveFiles({ requestPage });

    assert.deepEqual(files, [
      createFile('file-1'),
      createFile('file-2'),
      createFile('file-3'),
    ]);
    assert.deepEqual(
      requests.map(({ pageToken }) => pageToken),
      [undefined, 'page-2', 'page-3'],
    );
  });

  it('keeps only the first occurrence of a Drive file id across pages', async () => {
    const originalFile = createFile('file-1');
    const { requestPage } = createPageRequest([
      {
        files: [originalFile],
        nextPageToken: 'page-2',
      },
      {
        files: [{ ...originalFile, name: 'Changed during pagination.mp3' }],
      },
    ]);

    const files = await paginateDriveFiles({ requestPage });

    assert.deepEqual(files, [originalFile]);
  });

  it('propagates the abort signal and stops before requesting another page', async () => {
    const abortController = new AbortController();
    const requests: Parameters<DriveFilesPageRequest>[0][] = [];
    const requestPage: DriveFilesPageRequest = async (options) => {
      requests.push(options);
      abortController.abort();

      return {
        files: [createFile('file-1')],
        nextPageToken: 'page-2',
      };
    };

    await assert.rejects(
      paginateDriveFiles({
        requestPage,
        signal: abortController.signal,
      }),
      { name: 'AbortError' },
    );
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.signal, abortController.signal);
  });

  it('rejects the operation when a later page request fails', async () => {
    let requestCount = 0;
    const requestPage: DriveFilesPageRequest = async () => {
      requestCount += 1;

      if (requestCount === 1) {
        return {
          files: [createFile('file-1')],
          nextPageToken: 'page-2',
        };
      }

      throw new Error('Drive page request failed');
    };

    await assert.rejects(
      paginateDriveFiles({ requestPage }),
      /Drive page request failed/,
    );
  });
});
