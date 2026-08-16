/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addLibraryEntityTag,
  parseLibraryTagInput,
  removeLibraryEntityTag,
} from './model.js';

describe('tag editor model', () => {
  it('parses comma-delimited input into normalized tags', () => {
    assert.deepEqual(parseLibraryTagInput(' alto, tenor , , warm  up '), [
      'alto',
      'tenor',
      'warm up',
    ]);
  });

  it('adds parsed tags and keeps existing unique tags stable', () => {
    assert.deepEqual(
      addLibraryEntityTag(['Alto', 'Tenor'], 'soprano, alto, rehearsal'),
      ['Alto', 'Tenor', 'soprano', 'rehearsal'],
    );
  });

  it('removes only the selected tag token', () => {
    assert.deepEqual(
      removeLibraryEntityTag(['Alto', 'Tenor', 'Warm up'], 'Tenor'),
      ['Alto', 'Warm up'],
    );
  });
});
