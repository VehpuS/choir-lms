/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  normalizeRecentSearchTerm,
  recordRecentSearchTerm,
} from './search-history.js';

describe('search history', () => {
  it('normalizes recent search terms before recording them', () => {
    assert.equal(normalizeRecentSearchTerm('  Kyrie  '), 'Kyrie');
    assert.equal(normalizeRecentSearchTerm('   '), null);
  });

  it('promotes recent search terms to the front without duplicates', () => {
    assert.deepEqual(
      recordRecentSearchTerm(
        ['Bass Focus', 'Kyrie Warmups', 'Entrance cue'],
        ' kyrie warmups ',
      ),
      ['kyrie warmups', 'Bass Focus', 'Entrance cue'],
    );
  });

  it('caps the stored recent search list to five entries', () => {
    assert.deepEqual(
      recordRecentSearchTerm(['One', 'Two', 'Three', 'Four', 'Five'], 'Six'),
      ['Six', 'One', 'Two', 'Three', 'Four'],
    );
  });
});
