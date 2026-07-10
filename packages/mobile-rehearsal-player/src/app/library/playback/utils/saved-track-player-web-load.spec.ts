/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { patchSavedTrackPlayerWebRuntime } from './saved-track-player-web-load.js';

describe('patchSavedTrackPlayerWebRuntime', () => {
  const createPatchedRuntime = () => {
    const addCalls: Array<{
      insertBeforeIndex?: number;
      tracks: Array<{
        headers?: Record<string, string>;
        url: string;
      }>;
    }> = [];
    const fetchCalls: Array<{
      headers?: Record<string, string>;
      input: string;
    }> = [];
    const loadCalls: Array<{
      headers?: Record<string, string>;
      url: string;
    }> = [];
    const revokedUrls: string[] = [];
    const shakaLoadCalls: string[] = [];
    let blobIndex = 0;
    const mediaElement = {
      loadCallCount: 0,
      src: '',
      load() {
        mediaElement.loadCallCount += 1;
      },
      removeAttribute(name: string) {
        if (name === 'src') {
          mediaElement.src = '';
        }
      },
    };
    const trackPlayerWebPlayer = {
      getMediaElement() {
        return mediaElement;
      },
      async load(url: string) {
        shakaLoadCalls.push(url);
        return undefined;
      },
    };
    const runtime = {
      async add(
        tracks: Array<{
          headers?: Record<string, string>;
          url: string;
        }>,
        insertBeforeIndex?: number,
      ) {
        addCalls.push({
          insertBeforeIndex,
          tracks,
        });

        return undefined;
      },
      async load(track: { headers?: Record<string, string>; url: string }) {
        loadCalls.push(track);
        return undefined;
      },
      async reset() {
        return undefined;
      },
      async setupPlayer() {
        return undefined;
      },
      async stop() {
        return undefined;
      },
    };

    patchSavedTrackPlayerWebRuntime(runtime, {
      async fetch(input, init) {
        fetchCalls.push({
          headers: init?.headers,
          input,
        });

        return {
          async blob() {
            return new Blob([`audio-${blobIndex + 1}`], {
              type: 'audio/mpeg',
            });
          },
          ok: true,
          status: 200,
        };
      },
      urlApi: {
        createObjectURL() {
          blobIndex += 1;
          return `blob:track-${blobIndex}`;
        },
        revokeObjectURL(url) {
          revokedUrls.push(url);
        },
      },
      windowApi: {
        rntp: trackPlayerWebPlayer,
      },
    });

    return {
      addCalls,
      fetchCalls,
      loadCalls,
      mediaElement,
      revokedUrls,
      runtime,
      trackPlayerWebPlayer,
      shakaLoadCalls,
    };
  };

  it('fetches blob-backed media for header-authenticated web tracks added through add', async () => {
    const { addCalls, fetchCalls, runtime } = createPatchedRuntime();

    await runtime.setupPlayer();
    await runtime.add(
      [
        {
          headers: {
            Authorization: 'Bearer token',
          },
          url: 'https://example.com/track.mp3',
        },
      ],
      2,
    );

    assert.deepEqual(fetchCalls, [
      {
        headers: {
          Authorization: 'Bearer token',
        },
        input: 'https://example.com/track.mp3',
      },
    ]);
    assert.deepEqual(addCalls, [
      {
        insertBeforeIndex: 2,
        tracks: [
          {
            headers: {},
            url: 'blob:track-1',
          },
        ],
      },
    ]);
  });

  it('keeps the default load path for tracks without auth headers', async () => {
    const { fetchCalls, loadCalls, runtime } = createPatchedRuntime();

    await runtime.setupPlayer();
    await runtime.load({
      url: 'https://example.com/track.mp3',
    });

    assert.deepEqual(fetchCalls, []);
    assert.deepEqual(loadCalls, [
      {
        url: 'https://example.com/track.mp3',
      },
    ]);
  });

  it('routes blob urls through the media element after setup', async () => {
    const { mediaElement, runtime, shakaLoadCalls, trackPlayerWebPlayer } =
      createPatchedRuntime();

    await runtime.setupPlayer();

    await assert.doesNotReject(async () => {
      await trackPlayerWebPlayer.load('blob:track-1');
    });

    assert.deepEqual(shakaLoadCalls, []);
    assert.equal(mediaElement.src, 'blob:track-1');
    assert.equal(mediaElement.loadCallCount, 1);
  });

  it('revokes active blob urls and clears the media source on reset', async () => {
    const { mediaElement, revokedUrls, runtime } = createPatchedRuntime();

    await runtime.setupPlayer();
    await runtime.load({
      headers: {
        Authorization: 'Bearer token',
      },
      url: 'https://example.com/track.mp3',
    });

    mediaElement.src = 'blob:track-1';
    await runtime.reset();

    assert.deepEqual(revokedUrls, ['blob:track-1']);
    assert.equal(mediaElement.src, '');
    assert.equal(mediaElement.loadCallCount, 1);
  });

  it('keeps blob urls alive across repeated load calls until reset', async () => {
    const { loadCalls, revokedUrls, runtime } = createPatchedRuntime();

    await runtime.setupPlayer();
    await runtime.load({
      headers: {
        Authorization: 'Bearer token',
      },
      url: 'https://example.com/track-a.mp3',
    });
    await runtime.load({
      headers: {
        Authorization: 'Bearer token',
      },
      url: 'https://example.com/track-b.mp3',
    });

    assert.deepEqual(loadCalls, [
      {
        headers: {},
        url: 'blob:track-1',
      },
      {
        headers: {},
        url: 'blob:track-2',
      },
    ]);
    assert.deepEqual(revokedUrls, []);

    await runtime.reset();

    assert.deepEqual(revokedUrls, ['blob:track-1', 'blob:track-2']);
  });
});
