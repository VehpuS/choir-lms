/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSearchInputValue } from './search-input-value.js';

describe('resolveSearchInputValue', () => {
  it('preserves the typed input while sync is disabled', () => {
    assert.equal(
      resolveSearchInputValue({
        currentInputValue: ' Kyrie ',
        query: 'Kyrie',
        syncInputValue: false,
      }),
      ' Kyrie ',
    );
  });

  it('normalizes the input only when syncing to an external query', () => {
    assert.equal(
      resolveSearchInputValue({
        currentInputValue: ' Kyrie ',
        query: '  Kyrie  ',
        syncInputValue: true,
      }),
      'Kyrie',
    );

    assert.equal(
      resolveSearchInputValue({
        currentInputValue: ' Kyrie ',
        query: '   ',
        syncInputValue: true,
      }),
      '',
    );
  });
});/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSearchInputValue } from './search-input-value.js';

describe('search input value', () => {
  it('preserves the raw typed input while search execution trims only the effective query', () => {
    assert.equal(
      resolveSearchInputValue({
        currentInputValue: 'amen cadence ',
        query: 'amen cadence ',
        syncInputValue: false,
      }),
      'amen cadence ',
    );
  });

  it('normalizes the input when a recent search term is selected explicitly', () => {
    assert.equal(
      resolveSearchInputValue({
        currentInputValue: '',
        query: ' amen cadence ',
        syncInputValue: true,
      }),
      'amen cadence',
    );
  });
});
