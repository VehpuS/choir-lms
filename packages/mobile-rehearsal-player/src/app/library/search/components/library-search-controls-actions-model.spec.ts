import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSearchToggleIsFilled } from './library-search-controls-actions-model';

describe('resolveSearchToggleIsFilled', () => {
  it('renders filled while the search bar is open', () => {
    assert.equal(resolveSearchToggleIsFilled(true), true);
  });

  it('renders not filled while the search bar is closed', () => {
    assert.equal(resolveSearchToggleIsFilled(false), false);
  });
});
