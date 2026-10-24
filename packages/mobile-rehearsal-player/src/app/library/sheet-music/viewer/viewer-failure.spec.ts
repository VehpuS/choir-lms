import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SheetMusicSource } from '@org/audio-library-models';

import { resolveViewerFailure } from './viewer-failure.js';

const source: SheetMusicSource = {
  addedAt: '2026-01-01T00:00:00.000Z',
  format: 'pdf',
  id: 'sm-1',
  label: 'Score',
  location: { kind: 'url', url: 'https://example.com/score.pdf' },
};

describe('resolveViewerFailure', () => {
  it('has no failure while the document is loading', () => {
    assert.equal(
      resolveViewerFailure({
        canSaveToDrive: true,
        outcome: undefined,
        source,
        state: { status: 'loading' },
      }),
      undefined,
    );
  });

  it('describes a failed load, offering Save to Drive when a save flow exists', () => {
    const failure = resolveViewerFailure({
      canSaveToDrive: true,
      outcome: undefined,
      source,
      state: { reason: 'blocked', status: 'failed' },
    });

    assert.deepEqual(failure?.actions, ['save-to-drive', 'open-external']);
  });

  it('drops Save to Drive where there is no save flow', () => {
    const failure = resolveViewerFailure({
      canSaveToDrive: false,
      outcome: undefined,
      source,
      state: { reason: 'blocked', status: 'failed' },
    });

    assert.deepEqual(failure?.actions, ['open-external']);
  });

  it('describes a failure that came from drawing a loaded document', () => {
    const failure = resolveViewerFailure({
      canSaveToDrive: true,
      outcome: { kind: 'failed', reason: 'not-found' },
      source,
      state: { status: 'loading' },
    });

    assert.equal(failure?.title, 'File not found');
  });

  it('shows nothing for a request the caller cancelled', () => {
    assert.equal(
      resolveViewerFailure({
        canSaveToDrive: true,
        outcome: undefined,
        source,
        state: { reason: 'aborted', status: 'failed' },
      }),
      undefined,
    );
  });
});
