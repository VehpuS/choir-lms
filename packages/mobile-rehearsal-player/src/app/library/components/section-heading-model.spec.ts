/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hasSectionHeadingContent } from './section-heading-model.js';

describe('section heading model', () => {
  it('returns true when any copy is present', () => {
    assert.equal(
      hasSectionHeadingContent({
        eyebrow: 'Library',
      }),
      true,
    );
    assert.equal(
      hasSectionHeadingContent({
        title: 'Saved tracks',
      }),
      true,
    );
    assert.equal(
      hasSectionHeadingContent({
        body: 'Search your saved library',
      }),
      true,
    );
  });

  it('returns true when only trailing action is present', () => {
    assert.equal(
      hasSectionHeadingContent({
        hasTrailingAction: true,
      }),
      true,
    );
  });

  it('returns false when no copy or trailing action is present', () => {
    assert.equal(hasSectionHeadingContent({}), false);
  });
});
