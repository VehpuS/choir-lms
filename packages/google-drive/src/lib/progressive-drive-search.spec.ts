import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { searchDriveAudioFiles } from './google-drive.js';

const SUPPORTED_MIME_TYPES = ['audio/mpeg'];
const SUPPORTED_EXTENSIONS = ['mp3'];
const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('progressive Drive search', () => {
  it('publishes path-aware results before requesting later pages', async () => {
    const snapshots: string[][] = [];
    let ancestorRequestCount = 0;
    let snapshotCountBeforeSecondPage = 0;

    globalThis.fetch = async (input) => {
      const requestUrl = new URL(String(input));
      const pageToken = requestUrl.searchParams.get('pageToken');

      if (!requestUrl.searchParams.has('q')) {
        ancestorRequestCount += 1;
        return Response.json({
          id: 'shared-parent',
          name: 'Shared rehearsal folder',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [],
          shared: true,
        });
      }

      if (pageToken === 'search-page-2') {
        snapshotCountBeforeSecondPage = snapshots.length;
        return Response.json({
          files: [
            {
              id: 'track-2',
              name: 'Result Two.mp3',
              mimeType: 'audio/mpeg',
              fileExtension: 'mp3',
              parents: ['shared-parent'],
              shared: true,
            },
          ],
        });
      }

      return Response.json({
        files: [
          {
            id: 'track-1',
            name: 'Result One.mp3',
            mimeType: 'audio/mpeg',
            fileExtension: 'mp3',
            parents: ['shared-parent'],
            shared: true,
          },
        ],
        nextPageToken: 'search-page-2',
      });
    };

    const snapshot = await searchDriveAudioFiles({
      accessToken: 'drive-token',
      onProgress: (progressSnapshot) => {
        snapshots.push(
          progressSnapshot.results.map((result) => {
            return `${result.name}:${result.locationLabel}`;
          }),
        );
      },
      query: 'Result',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.equal(snapshotCountBeforeSecondPage, 1);
    assert.equal(ancestorRequestCount, 1);
    assert.deepEqual(snapshots, [
      ['Result One.mp3:Shared with you / Shared rehearsal folder'],
      [
        'Result One.mp3:Shared with you / Shared rehearsal folder',
        'Result Two.mp3:Shared with you / Shared rehearsal folder',
      ],
    ]);
    assert.equal(snapshot.results.length, 2);
  });

  it('publishes large first pages in smaller path-resolved batches', async () => {
    const publishedResultCounts: number[] = [];
    const files = Array.from({ length: 25 }, (_, index) => ({
      id: `drive-file-${index + 1}`,
      name: `Track ${index + 1}.mp3`,
      mimeType: 'audio/mpeg',
      fileExtension: 'mp3',
      parents: ['root'],
    }));

    globalThis.fetch = async () => {
      return Response.json({ files });
    };

    await searchDriveAudioFiles({
      accessToken: 'drive-token',
      onProgress: (progressSnapshot) => {
        publishedResultCounts.push(progressSnapshot.results.length);
      },
      query: 'Track',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.deepEqual(publishedResultCounts, [12, 24, 25]);
  });
});
