/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPlaybackDownloadLabel } from './saved-track-download-label.js';

const downloading = (overrides: {
  isSlow?: boolean;
  receivedBytes?: number;
  totalBytes?: number | null;
}) => {
  return {
    downloadId: 1,
    isSlow: overrides.isSlow ?? false,
    receivedBytes: overrides.receivedBytes ?? 0,
    startedAtMs: 0,
    status: 'downloading' as const,
    totalBytes:
      overrides.totalBytes === undefined ? 1000 : overrides.totalBytes,
  };
};

describe('playback download label', () => {
  it('shows nothing when no download is running', () => {
    assert.equal(getPlaybackDownloadLabel({ status: 'idle' }), null);
  });

  it('shows the percentage received while loading', () => {
    assert.equal(
      getPlaybackDownloadLabel(downloading({ receivedBytes: 425 })),
      'Loading from Google Drive · 42%',
    );
  });

  it('says it is loading without a percentage when the size is unknown', () => {
    assert.equal(
      getPlaybackDownloadLabel(downloading({ totalBytes: null })),
      'Loading from Google Drive…',
    );
  });

  it('calls out a slow connection once the download is slow', () => {
    assert.equal(
      getPlaybackDownloadLabel(
        downloading({ isSlow: true, receivedBytes: 90 }),
      ),
      'Slow connection · 9% downloaded',
    );
    assert.equal(
      getPlaybackDownloadLabel(downloading({ isSlow: true, totalBytes: null })),
      'Slow connection · still downloading from Google Drive',
    );
  });

  it('never reports more than 100%', () => {
    assert.equal(
      getPlaybackDownloadLabel(downloading({ receivedBytes: 1200 })),
      'Loading from Google Drive · 100%',
    );
  });
});
