/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDestinationHeaderModel } from './destination-header-model.js';

describe('destination header model', () => {
  it('keeps compact destination titles aligned across the main shell surfaces', () => {
    assert.deepEqual(getDestinationHeaderModel('library'), {
      hasSearchActions: true,
      showsDriveSessionMenu: true,
      title: 'Library',
    });
    assert.deepEqual(getDestinationHeaderModel('add'), {
      hasSearchActions: true,
      showsDriveSessionMenu: true,
      title: 'Add',
    });
    assert.deepEqual(getDestinationHeaderModel('recents'), {
      hasSearchActions: false,
      showsDriveSessionMenu: true,
      title: 'Recents',
    });
  });
});
