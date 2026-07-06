/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveHeaderSearchToggleOutcome } from './header-search-toggle-model.js';

describe('headerSearchToggleModel', () => {
  it('opens search without submitting when the query is blank', () => {
    assert.deepEqual(
      resolveHeaderSearchToggleOutcome({
        isSearchBarVisible: false,
        searchQuery: '   ',
      }),
      {
        nextIsSearchBarVisible: true,
        shouldDeactivateSearch: false,
        shouldSubmitSearch: false,
      },
    );
  });

  it('opens search and submits immediately when a query already exists', () => {
    assert.deepEqual(
      resolveHeaderSearchToggleOutcome({
        isSearchBarVisible: false,
        searchQuery: 'alto line',
      }),
      {
        nextIsSearchBarVisible: true,
        shouldDeactivateSearch: false,
        shouldSubmitSearch: true,
      },
    );
  });

  it('closes search and deactivates the active query state', () => {
    assert.deepEqual(
      resolveHeaderSearchToggleOutcome({
        isSearchBarVisible: true,
        searchQuery: 'tenor cue',
      }),
      {
        nextIsSearchBarVisible: false,
        shouldDeactivateSearch: true,
        shouldSubmitSearch: false,
      },
    );
  });
});
