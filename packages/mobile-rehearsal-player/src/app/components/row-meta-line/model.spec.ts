/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { splitRowMetaSegments } from './model.js';

describe('splitRowMetaSegments', () => {
  it('marks durations and time ranges as timecodes', () => {
    assert.deepEqual(splitRowMetaSegments('Loop · 1:12–1:48 · 0:36'), [
      { isTimecode: false, text: 'Loop' },
      { isTimecode: true, text: '1:12–1:48' },
      { isTimecode: true, text: '0:36' },
    ]);
  });

  it('keeps words, counts, and tag names as plain text', () => {
    assert.deepEqual(splitRowMetaSegments('4:41 · Alto · 3 loops'), [
      { isTimecode: true, text: '4:41' },
      { isTimecode: false, text: 'Alto' },
      { isTimecode: false, text: '3 loops' },
    ]);
  });

  it('splits legacy bullet-joined meta the same way', () => {
    assert.deepEqual(
      splitRowMetaSegments('Library / Warmups • 1:02:15').map((segment) => {
        return segment.isTimecode;
      }),
      [false, true],
    );
  });

  it('returns one plain segment when there is no separator', () => {
    assert.deepEqual(splitRowMetaSegments('Track'), [
      { isTimecode: false, text: 'Track' },
    ]);
  });
});
