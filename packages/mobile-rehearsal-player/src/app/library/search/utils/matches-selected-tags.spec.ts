/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { matchesSelectedTags } from './saved-library-search-view-model.js';

describe('matchesSelectedTags', () => {
  it('matches under all mode only when every selected tag is present', () => {
    assert.equal(
      matchesSelectedTags({
        matchMode: 'all',
        selectedTags: ['alto', 'warmup'],
        tags: ['Alto', 'Warmup', 'Extra'],
      }),
      true,
    );
    assert.equal(
      matchesSelectedTags({
        matchMode: 'all',
        selectedTags: ['alto', 'warmup'],
        tags: ['Alto'],
      }),
      false,
    );
  });

  it('matches under any mode when at least one selected tag is present', () => {
    assert.equal(
      matchesSelectedTags({
        matchMode: 'any',
        selectedTags: ['alto', 'warmup'],
        tags: ['Warmup'],
      }),
      true,
    );
  });

  it('does not match under any mode when the entity has none of the selected tags', () => {
    assert.equal(
      matchesSelectedTags({
        matchMode: 'any',
        selectedTags: ['alto', 'warmup'],
        tags: ['Bass'],
      }),
      false,
    );
  });

  it('trivially matches with no selected tags and never matches with no entity tags, under both modes', () => {
    assert.equal(
      matchesSelectedTags({
        matchMode: 'all',
        selectedTags: [],
        tags: undefined,
      }),
      true,
    );
    assert.equal(
      matchesSelectedTags({
        matchMode: 'any',
        selectedTags: [],
        tags: undefined,
      }),
      true,
    );
    assert.equal(
      matchesSelectedTags({
        matchMode: 'all',
        selectedTags: ['alto'],
        tags: [],
      }),
      false,
    );
    assert.equal(
      matchesSelectedTags({
        matchMode: 'any',
        selectedTags: ['alto'],
        tags: [],
      }),
      false,
    );
  });
});
