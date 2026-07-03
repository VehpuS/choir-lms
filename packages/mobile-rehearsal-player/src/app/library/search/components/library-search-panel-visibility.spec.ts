/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_LIBRARY_SEARCH_PANEL_VISIBILITY,
  resolveLibrarySearchActionVisibility,
  toggleLibraryFilterPopoverVisibility,
} from './library-search-panel-visibility.js';

describe('librarySearchPanelVisibility', () => {
  it('toggles the filter popover without changing search visibility', () => {
    const filterVisible = toggleLibraryFilterPopoverVisibility(
      DEFAULT_LIBRARY_SEARCH_PANEL_VISIBILITY,
    );

    assert.deepEqual(filterVisible, {
      isFilterPopoverVisible: true,
      isSearchBarVisible: false,
    });

    assert.deepEqual(
      toggleLibraryFilterPopoverVisibility(filterVisible),
      DEFAULT_LIBRARY_SEARCH_PANEL_VISIBILITY,
    );
  });

  it('toggles search visibility without changing filter visibility', () => {
    assert.deepEqual(
      resolveLibrarySearchActionVisibility({
        isFilterPopoverVisible: true,
        isSearchBarVisible: false,
      }),
      {
        isFilterPopoverVisible: true,
        isSearchBarVisible: true,
      },
    );

    assert.deepEqual(
      resolveLibrarySearchActionVisibility({
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
    const searchVisible = resolveLibrarySearchActionVisibility(
      DEFAULT_LIBRARY_SEARCH_PANEL_VISIBILITY,
    );

    assert.deepEqual(searchVisible, {
      isFilterPopoverVisible: false,
      isSearchBarVisible: true,
    });

    assert.deepEqual(
      resolveLibrarySearchActionVisibility(searchVisible),
      DEFAULT_LIBRARY_SEARCH_PANEL_VISIBILITY,
    );
  });
});
