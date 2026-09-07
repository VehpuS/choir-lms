import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { searchDriveAudioFiles } from './google-drive.js';

const SUPPORTED_MIME_TYPES = ['audio/mpeg'];
const SUPPORTED_EXTENSIONS = ['mp3'];
const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('Drive mixed search', () => {
  it('partitions matching folders and supported audio into typed results', async () => {
    let requestUrl = '';

    globalThis.fetch = async (input) => {
      requestUrl = String(input);

      return Response.json({
        files: [
          {
            id: 'folder-kyrie',
            name: 'Kyrie folder',
            mimeType: 'application/vnd.google-apps.folder',
            shared: true,
          },
          {
            id: 'drive-file-supported',
            name: 'Kyrie.mp3',
            mimeType: 'audio/mpeg',
            fileExtension: 'mp3',
            shared: true,
          },
          {
            id: 'drive-file-unsupported',
            name: 'Kyrie practice.aiff',
            mimeType: 'audio/aiff',
            fileExtension: 'aiff',
          },
        ],
      });
    };

    const snapshot = await searchDriveAudioFiles({
      accessToken: 'drive-token',
      query: 'Kyrie',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.match(
      requestUrl,
      /mimeType\+%3D\+%27application%2Fvnd\.google-apps\.folder%27/,
    );
    assert.deepEqual(
      snapshot.results.map((result) => [result.kind, result.name]),
      [
        ['folder', 'Kyrie folder'],
        ['audio', 'Kyrie.mp3'],
      ],
    );

    const folderResult = snapshot.results[0];

    assert.ok(folderResult?.kind === 'folder');
    assert.equal(folderResult.rootKind, 'shared');
    assert.equal(snapshot.unavailableSources.length, 1);
  });

  it('returns no mixed results for a blank query', async () => {
    const snapshot = await searchDriveAudioFiles({
      accessToken: 'drive-token',
      query: '   ',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.deepEqual(snapshot.results, []);
  });
});
