/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldShowSavedLoopBrowseContent } from './saved-loop-section-model.js';

describe('saved loop section model', () => {
  it('hides browse content while the loop builder has isolated focus', () => {
    assert.equal(
      shouldShowSavedLoopBrowseContent({
        isBrowseListSuppressed: false,
        isBuilderFocused: true,
        isTrackLoopDetailVisible: false,
      }),
      false,
    );
  });

  it('keeps normal browse content outside focused builder and detail modes', () => {
    assert.equal(
      shouldShowSavedLoopBrowseContent({
        isBrowseListSuppressed: false,
        isBuilderFocused: false,
        isTrackLoopDetailVisible: false,
      }),
      true,
    );
    assert.equal(
      shouldShowSavedLoopBrowseContent({
        isBrowseListSuppressed: false,
        isBuilderFocused: false,
        isTrackLoopDetailVisible: true,
      }),
      false,
    );
  });

  it('hides browse content when the current view suppresses the Saved loops list, while builder/detail flags still apply independently', () => {
    assert.equal(
      shouldShowSavedLoopBrowseContent({
        isBrowseListSuppressed: true,
        isBuilderFocused: false,
        isTrackLoopDetailVisible: false,
      }),
      false,
    );
    assert.equal(
      shouldShowSavedLoopBrowseContent({
        isBrowseListSuppressed: false,
        isBuilderFocused: true,
        isTrackLoopDetailVisible: false,
      }),
      false,
    );
  });
});
