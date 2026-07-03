/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_LIBRARY_SEARCH_CONTROLS_VISIBILITY,
  toggleLibraryFilterVisibility,
  toggleLibrarySearchVisibility,
} from './library-search-controls-visibility.js';

describe('librarySearchControlsVisibility', () => {
  it('toggles the filter popover without changing search visibility', () => {
    const filterVisible = toggleLibraryFilterVisibility(
      DEFAULT_LIBRARY_SEARCH_CONTROLS_VISIBILITY,
    );

    assert.deepEqual(filterVisible, {
      isFilterPopoverVisible: true,
      isSearchBarVisible: false,
    });

    assert.deepEqual(
      toggleLibraryFilterVisibility(filterVisible),
      DEFAULT_LIBRARY_SEARCH_CONTROLS_VISIBILITY,
    );
  });

  it('toggles search visibility without changing filter visibility', () => {
    assert.deepEqual(
      toggleLibrarySearchVisibility({
        isFilterPopoverVisible: true,
        isSearchBarVisible: false,
      }),
      {
        isFilterPopoverVisible: true,
        isSearchBarVisible: true,
      },
    );

    assert.deepEqual(
      toggleLibrarySearchVisibility({
        isFilterPopoverVisible: true,
        isSearchBarVisible: true,
      }),
      {
        isFilterPopoverVisible: true,
        isSearchBarVisible: false,
      },
    );
  });

  it('toggles search visibility when no filter popover is active', () => {
    const searchVisible = toggleLibrarySearchVisibility(
      DEFAULT_LIBRARY_SEARCH_CONTROLS_VISIBILITY,
    );

    assert.deepEqual(searchVisible, {
      isFilterPopoverVisible: false,
      isSearchBarVisible: true,
    });

    assert.deepEqual(
      toggleLibrarySearchVisibility(searchVisible),
      DEFAULT_LIBRARY_SEARCH_CONTROLS_VISIBILITY,
    );
  });
});
