import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  RECORDINGS_DRIVE_OPTIONS,
  RECORDINGS_KIND_OPTIONS,
  RECORDINGS_SORT_OPTIONS,
  toggleChoice,
} from './recordings-library-controls-model';

describe('recordings library controls', () => {
  it('offers the sorts and filters the spec names, in order', () => {
    assert.deepEqual(
      RECORDINGS_SORT_OPTIONS.map((option) => option.label),
      ['Newest', 'Track', 'Length', 'Name'],
    );
    assert.deepEqual(
      RECORDINGS_KIND_OPTIONS.map((option) => option.label),
      ['Whole track', 'Segment', 'Loop', 'Adjusted'],
    );
    assert.deepEqual(
      RECORDINGS_DRIVE_OPTIONS.map((option) => option.label),
      ['On Drive', 'Not on Drive'],
    );
  });

  it('clears a choice chosen twice and replaces it with another', () => {
    assert.equal(toggleChoice('loop', 'loop'), undefined);
    assert.equal(toggleChoice('loop', 'segment'), 'segment');
    assert.equal(toggleChoice(undefined, 'loop'), 'loop');
  });
});
