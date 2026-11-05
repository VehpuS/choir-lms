import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildRecordingFixture } from './recording-fixtures.js';
import { countRecordingsFor } from './recordings-menu-count.js';

const saved = {
  savedLoopIds: new Set(['loop-1']),
  savedSourceIds: new Set(['track-1']),
};

const onTrack = buildRecordingFixture({ id: 'a' });
const onLoop = buildRecordingFixture({
  id: 'b',
  lineage: {
    track: { id: 'track-1', driveFileId: 'drive-1', name: 'Song.mp3' },
    loop: { id: 'loop-1', name: 'Verse', startMs: 0, endMs: 10_000 },
  },
});

describe('counting recordings for a menu', () => {
  it('counts a track’s own recordings and those on its loops', () => {
    assert.equal(
      countRecordingsFor(
        { id: 'track-1', kind: 'track' },
        [onTrack, onLoop],
        saved,
      ),
      2,
    );
  });

  it('counts only a loop’s own recordings', () => {
    assert.equal(
      countRecordingsFor(
        { id: 'loop-1', kind: 'loop' },
        [onTrack, onLoop],
        saved,
      ),
      1,
    );
  });

  it('is zero for an item with none', () => {
    assert.equal(
      countRecordingsFor(
        { id: 'track-9', kind: 'track' },
        [onTrack, onLoop],
        saved,
      ),
      0,
    );
  });
});
