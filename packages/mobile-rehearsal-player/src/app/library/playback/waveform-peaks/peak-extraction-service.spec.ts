/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  emitSavedTrackDownloaded,
  subscribeToSavedTrackDownloads,
} from '../utils/saved-track-download-events.js';
import { startWaveformPeakExtraction } from './peak-extraction-service.js';
import { createTestPeaks } from './peak-test-helpers.js';

describe('waveform peak extraction service', () => {
  it('analyzes the bytes of a finished download under its Drive file id', async () => {
    const ingested: string[] = [];
    const audio = new Blob(['audio']);
    const stop = startWaveformPeakExtraction({
      extract: async (blob) => {
        assert.equal(blob, audio);
        return createTestPeaks();
      },
      registry: {
        async ingest(key, extract) {
          ingested.push(key);
          assert.ok(await extract());
        },
      },
      subscribe: subscribeToSavedTrackDownloads,
    });

    emitSavedTrackDownloaded({ blob: audio, driveFileId: 'file-1' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    stop();

    assert.deepEqual(ingested, ['file-1']);
  });

  it('ignores downloads that are not Drive files and stops after unsubscribing', () => {
    const ingested: string[] = [];
    const stop = startWaveformPeakExtraction({
      extract: async () => null,
      registry: {
        async ingest(key) {
          ingested.push(key);
        },
      },
      subscribe: subscribeToSavedTrackDownloads,
    });

    emitSavedTrackDownloaded({ blob: new Blob([]), driveFileId: null });
    stop();
    emitSavedTrackDownloaded({ blob: new Blob([]), driveFileId: 'file-2' });

    assert.deepEqual(ingested, []);
  });

  it('keeps delivering to other subscribers when one throws', () => {
    let delivered = 0;
    const stopThrowing = subscribeToSavedTrackDownloads(() => {
      throw new Error('subscriber failed');
    });
    const stopCounting = subscribeToSavedTrackDownloads(() => {
      delivered += 1;
    });

    emitSavedTrackDownloaded({ blob: new Blob([]), driveFileId: 'file-3' });
    stopThrowing();
    stopCounting();

    assert.equal(delivered, 1);
  });
});
