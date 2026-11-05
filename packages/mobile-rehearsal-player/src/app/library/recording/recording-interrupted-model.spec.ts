import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  describeInterruptedTake,
  sortInterruptedTakes,
} from './recording-interrupted-model.js';
import { buildRecordingFixture } from './recording-fixtures.js';

const APP_STARTED = Date.parse('2026-01-03T00:00:00.000Z');

describe('sorting interrupted takes', () => {
  it('offers takes from earlier sessions, oldest first', () => {
    const later = buildRecordingFixture({
      id: 'b',
      createdAt: '2026-01-02T12:00:00.000Z',
    });
    const earlier = buildRecordingFixture({
      id: 'a',
      createdAt: '2026-01-02T10:00:00.000Z',
    });

    assert.deepEqual(
      sortInterruptedTakes([later, earlier], APP_STARTED).offered.map(
        (take) => take.id,
      ),
      ['a', 'b'],
    );
  });

  it('discards a take under one second without offering it', () => {
    const short = buildRecordingFixture({ id: 's', durationMs: 400 });
    const result = sortInterruptedTakes([short], APP_STARTED);

    assert.deepEqual(result.offered, []);
    assert.deepEqual(
      result.discarded.map((take) => take.id),
      ['s'],
    );
  });

  it("never touches a take this session's recorder started", () => {
    const live = buildRecordingFixture({
      createdAt: '2026-01-03T00:00:05.000Z',
    });
    const result = sortInterruptedTakes([live], APP_STARTED);

    assert.deepEqual(result.offered, []);
    assert.deepEqual(result.discarded, []);
  });
});

describe('describing an interrupted take', () => {
  it('names the length and the track', () => {
    const text = describeInterruptedTake(buildRecordingFixture());

    assert.ok(text.includes('Song.mp3'));
    assert.ok(text.includes('0:42'));
  });
});
