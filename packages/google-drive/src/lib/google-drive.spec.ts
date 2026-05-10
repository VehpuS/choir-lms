import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  getDriveAuthorizationState,
  handleDriveSourceError,
  listDriveLibrary,
  mapDriveFileToAudioSource,
} from './google-drive.js';

const SUPPORTED_MIME_TYPES = ['audio/mpeg', 'audio/flac'];
const SUPPORTED_EXTENSIONS = ['mp3', 'flac'];

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('getDriveAuthorizationState', () => {
  it('derives unconfigured, attention, expired, and authorized states', () => {
    assert.equal(
      getDriveAuthorizationState({
        scope: 'drive.readonly',
      }).status,
      'unconfigured',
    );

    assert.equal(
      getDriveAuthorizationState({
        accessToken: 'token',
        error: 'refresh failed',
        scope: 'drive.readonly',
      }).status,
      'attention-required',
    );

    assert.equal(
      getDriveAuthorizationState(
        {
          accessToken: 'token',
          expiresAt: '2026-05-09T12:00:00.000Z',
          scope: 'drive.readonly',
        },
        new Date('2026-05-10T12:00:00.000Z'),
      ).status,
      'expired',
    );

    assert.equal(
      getDriveAuthorizationState(
        {
          accessToken: 'token',
          expiresAt: '2026-05-11T12:00:00.000Z',
          scope: 'drive.readonly',
        },
        new Date('2026-05-10T12:00:00.000Z'),
      ).status,
      'authorized',
    );
  });
});

describe('mapDriveFileToAudioSource', () => {
  it('normalizes supported Drive audio metadata into a playable source', () => {
    const source = mapDriveFileToAudioSource(
      {
        id: 'drive-file-1',
        name: 'Bass Section.FLAC',
        mimeType: 'audio/flac',
        fileExtension: 'FLAC',
        size: '4096',
        modifiedTime: '2026-05-10T10:00:00.000Z',
        audioMediaMetadata: {
          durationMillis: '180500',
        },
      },
      SUPPORTED_MIME_TYPES,
      SUPPORTED_EXTENSIONS,
    );

    assert.deepEqual(source, {
      id: 'drive:drive-file-1',
      provider: 'google-drive',
      driveFileId: 'drive-file-1',
      name: 'Bass Section.FLAC',
      mimeType: 'audio/flac',
      extension: 'flac',
      durationMs: 180500,
      sizeBytes: 4096,
      modifiedTime: '2026-05-10T10:00:00.000Z',
      webViewLink: undefined,
      iconLink: undefined,
      availability: {
        status: 'available',
      },
    });
  });

  it('marks unsupported files with an explicit availability reason', () => {
    const source = mapDriveFileToAudioSource(
      {
        id: 'drive-file-2',
        name: 'Tenor Guide.aiff',
        mimeType: 'audio/aiff',
        fileExtension: 'AIFF',
      },
      SUPPORTED_MIME_TYPES,
      SUPPORTED_EXTENSIONS,
    );

    assert.equal(source.availability.status, 'unsupported');
    assert.equal(source.availability.reason, 'unsupported-format');
    assert.equal(
      source.availability.message,
      'This Drive file format is outside the MVP audio set.',
    );
  });
});

describe('listDriveLibrary', () => {
  it('splits playable and unavailable sources from the Drive response', async () => {
    let requestUrl = '';
    let authorizationHeader = '';

    globalThis.fetch = async (input, init) => {
      requestUrl = String(input);
      authorizationHeader = String(
        init?.headers
          ? (init.headers as Record<string, string>).Authorization
          : '',
      );

      return new Response(
        JSON.stringify({
          files: [
            {
              id: 'drive-file-1',
              name: 'Alto Line.mp3',
              mimeType: 'audio/mpeg',
              fileExtension: 'mp3',
            },
            {
              id: 'drive-file-2',
              name: 'Score PDF',
              mimeType: 'application/pdf',
              fileExtension: 'pdf',
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    };

    const snapshot = await listDriveLibrary({
      accessToken: 'drive-token',
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });

    assert.match(
      requestUrl,
      /https:\/\/www\.googleapis\.com\/drive\/v3\/files\?/,
    );
    assert.match(requestUrl, /mimeType\+contains\+%27audio%2F%27/);
    assert.equal(authorizationHeader, 'Bearer drive-token');
    assert.equal(snapshot.playableSources.length, 1);
    assert.equal(snapshot.unavailableSources.length, 1);
    assert.equal(snapshot.playableSources[0]?.name, 'Alto Line.mp3');
    assert.equal(
      snapshot.unavailableSources[0]?.availability.status,
      'unsupported',
    );
  });

  it('maps Drive request failures onto unavailable source reasons', () => {
    const unavailableSource = handleDriveSourceError(
      mapDriveFileToAudioSource(
        {
          id: 'drive-file-3',
          name: 'Soprano Part.mp3',
          mimeType: 'audio/mpeg',
          fileExtension: 'mp3',
        },
        SUPPORTED_MIME_TYPES,
        SUPPORTED_EXTENSIONS,
      ),
      new Error('Drive library request failed with 403'),
    );

    assert.equal(unavailableSource.availability.status, 'unavailable');
    assert.equal(unavailableSource.availability.reason, 'access-revoked');
    assert.equal(
      unavailableSource.availability.message,
      'Drive library request failed with 403',
    );
  });
});
