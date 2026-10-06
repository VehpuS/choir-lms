/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getSelectAllToggleLabel,
  getSelectionCountLabel,
} from './selection-copy.js';

describe('selection copy', () => {
  it('uses one control that reads Select all, then Deselect all', () => {
    assert.equal(getSelectAllToggleLabel(false), 'Select all');
    assert.equal(getSelectAllToggleLabel(true), 'Deselect all');
  });

  it('labels the selection count', () => {
    assert.equal(getSelectionCountLabel(0), '0 selected');
    assert.equal(getSelectionCountLabel(4), '4 selected');
  });
});
