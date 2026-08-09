import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  shouldShowPlaybackStatusCard,
  shouldShowSavedLibraryStatusCard,
} from './status-card-visibility';

describe('Library status card visibility', () => {
  it('keeps routine saved-library loading and readiness out of browse layout', () => {
    assert.equal(
      shouldShowSavedLibraryStatusCard({
        isLoading: true,
        isSearchPanelVisible: false,
        savedSourceCount: 0,
        statusTone: 'neutral',
      }),
      false,
    );
    assert.equal(
      shouldShowSavedLibraryStatusCard({
        isLoading: false,
        isSearchPanelVisible: false,
        savedSourceCount: 1,
        statusTone: 'ready',
      }),
      false,
    );
  });

  it('preserves settled empty-library guidance', () => {
    assert.equal(
      shouldShowSavedLibraryStatusCard({
        isLoading: false,
        isSearchPanelVisible: false,
        savedSourceCount: 0,
        statusTone: 'neutral',
      }),
      true,
    );
  });

  it('keeps actionable saved-library warning and error states visible', () => {
    for (const statusTone of ['warning', 'error'] as const) {
      assert.equal(
        shouldShowSavedLibraryStatusCard({
          isLoading: false,
          isSearchPanelVisible: false,
          savedSourceCount: 1,
          statusTone,
        }),
        true,
      );
    }
  });

  it('shows only actionable playback states in Library content', () => {
    assert.equal(
      shouldShowPlaybackStatusCard({
        isSearchPanelVisible: false,
        statusTone: 'neutral',
      }),
      false,
    );
    assert.equal(
      shouldShowPlaybackStatusCard({
        isSearchPanelVisible: false,
        statusTone: 'ready',
      }),
      false,
    );
    assert.equal(
      shouldShowPlaybackStatusCard({
        isSearchPanelVisible: false,
        statusTone: 'error',
      }),
      true,
    );
  });
});
