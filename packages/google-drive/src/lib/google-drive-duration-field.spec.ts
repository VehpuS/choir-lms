import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { getDriveAudioSource, listDriveLibrary } from './google-drive.js';
import { resetDriveDurationFieldSupport } from './drive-files-client.js';

const SUPPORTED_MIME_TYPES = ['audio/mpeg', 'audio/flac'];

const SUPPORTED_EXTENSIONS = ['mp3', 'flac'];

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  // The duration field memory lasts a session; each test starts a new one.
  resetDriveDurationFieldSupport();
});

describe('the duration field memory (task 8.48)', () => {
  const INVALID_FIELD_RESPONSE = () =>
    new Response(
      JSON.stringify({
        error: {
          message: 'Invalid field selection audioMediaMetadata/durationMillis.',
        },
      }),
      { headers: { 'content-type': 'application/json' }, status: 400 },
    );
  const FILES_RESPONSE = () =>
    new Response(
      JSON.stringify({
        files: [
          {
            fileExtension: 'mp3',
            id: 'drive-file-9',
            mimeType: 'audio/mpeg',
            name: 'Alto.mp3',
          },
        ],
      }),
      { headers: { 'content-type': 'application/json' }, status: 200 },
    );
  const listOnce = () =>
    listDriveLibrary({
      accessToken: 'drive-token',
      supportedExtensions: SUPPORTED_EXTENSIONS,
      supportedMimeTypes: SUPPORTED_MIME_TYPES,
    });

  it('stops asking for the field after Drive rejects it once, so later listings make one request', async () => {
    const requestUrls: string[] = [];

    globalThis.fetch = async (input) => {
      requestUrls.push(String(input));

      return requestUrls.length === 1
        ? INVALID_FIELD_RESPONSE()
        : FILES_RESPONSE();
    };

    await listOnce();
    assert.equal(requestUrls.length, 2);

    await listOnce();
    await listOnce();

    // Two more listings, one request each, none with the rejected field.
    assert.equal(requestUrls.length, 4);
    assert.doesNotMatch(
      requestUrls[2] ?? '',
      /audioMediaMetadata%2FdurationMillis/,
    );
    assert.doesNotMatch(
      requestUrls[3] ?? '',
      /audioMediaMetadata%2FdurationMillis/,
    );
  });

  it('keeps asking for the field while Drive accepts it', async () => {
    const requestUrls: string[] = [];

    globalThis.fetch = async (input) => {
      requestUrls.push(String(input));

      return FILES_RESPONSE();
    };

    await listOnce();
    await listOnce();

    assert.equal(requestUrls.length, 2);
    assert.match(requestUrls[1] ?? '', /audioMediaMetadata%2FdurationMillis/);
  });

  it('applies the same memory to single-file lookups', async () => {
    const requestUrls: string[] = [];

    globalThis.fetch = async (input) => {
      requestUrls.push(String(input));

      return requestUrls.length === 1
        ? INVALID_FIELD_RESPONSE()
        : new Response(
            JSON.stringify({
              fileExtension: 'mp3',
              id: 'drive-file-7',
              mimeType: 'audio/mpeg',
              name: 'Alto.mp3',
            }),
            { headers: { 'content-type': 'application/json' }, status: 200 },
          );
    };
    const lookup = () =>
      getDriveAudioSource({
        accessToken: 'drive-token',
        driveFileId: 'drive-file-7',
        supportedExtensions: SUPPORTED_EXTENSIONS,
        supportedMimeTypes: SUPPORTED_MIME_TYPES,
      });

    await lookup();
    await lookup();
    await lookup();

    // One rejected request, then a retry, then one request per later lookup.
    assert.equal(requestUrls.length, 4);
    assert.doesNotMatch(
      requestUrls[3] ?? '',
      /audioMediaMetadata%2FdurationMillis/,
    );
  });

  it('does not blame the field when the request still fails for another reason', async () => {
    const requestUrls: string[] = [];
    let call = 0;

    globalThis.fetch = async (input) => {
      requestUrls.push(String(input));
      call += 1;

      // The first listing: every attempt is rejected, so nothing was learned.
      return call <= 3 ? INVALID_FIELD_RESPONSE() : FILES_RESPONSE();
    };

    await assert.rejects(listOnce());
    await listOnce();

    assert.match(requestUrls[3] ?? '', /audioMediaMetadata%2FdurationMillis/);
  });
});
