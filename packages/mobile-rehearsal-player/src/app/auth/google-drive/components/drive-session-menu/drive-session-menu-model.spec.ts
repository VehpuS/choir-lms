import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ACCOUNT_MENU_RESERVED_HEIGHT,
  getAccountMenuMaxHeight,
} from './drive-session-menu-model';

describe('getAccountMenuMaxHeight', () => {
  it('leaves the compact layout without a limit', () => {
    assert.equal(getAccountMenuMaxHeight('compact', 844), undefined);
  });

  it('limits the wide-short card to the window below the header', () => {
    assert.equal(
      getAccountMenuMaxHeight('wide-short', 390),
      390 - ACCOUNT_MENU_RESERVED_HEIGHT,
    );
  });

  it('never goes negative in a very short window', () => {
    assert.equal(getAccountMenuMaxHeight('wide-short', 40), 0);
  });
});
