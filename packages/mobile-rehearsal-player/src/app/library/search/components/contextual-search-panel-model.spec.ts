/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveSearchInputBlurOutcome,
  shouldShowRecentSearchSuggestions,
} from './contextual-search-panel-model.js';

describe('contextualSearchPanelModel', () => {
  it('skips recent-search commits for clear-action blur and resets the guard', () => {
    assert.deepEqual(
      resolveSearchInputBlurOutcome({
        shouldSkipBlurCommit: true,
      }),
      {
        nextShouldSkipBlurCommit: false,
        shouldCommitRecentSearch: false,
      },
    );

    assert.deepEqual(
      resolveSearchInputBlurOutcome({
        shouldSkipBlurCommit: false,
      }),
      {
        nextShouldSkipBlurCommit: false,
        shouldCommitRecentSearch: true,
      },
    );
  });

  it('shows recent suggestions only when allowed and query is empty', () => {
    assert.equal(
      shouldShowRecentSearchSuggestions({
        canShowRecentSearchTerms: true,
        recentSearchTerms: ['bass line'],
        searchQuery: '',
      }),
      true,
    );

    assert.equal(
      shouldShowRecentSearchSuggestions({
        canShowRecentSearchTerms: true,
        recentSearchTerms: ['alto cue'],
        searchQuery: 'a',
      }),
      false,
    );

    assert.equal(
      shouldShowRecentSearchSuggestions({
        canShowRecentSearchTerms: false,
        recentSearchTerms: ['tenor intro'],
        searchQuery: '',
      }),
      false,
    );

    assert.equal(
      shouldShowRecentSearchSuggestions({
        canShowRecentSearchTerms: true,
        recentSearchTerms: [],
        searchQuery: '',
      }),
      false,
    );
  });
});
