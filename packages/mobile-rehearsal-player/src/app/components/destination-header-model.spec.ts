/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDestinationHeaderModel } from './destination-header-model.js';

describe('destination header model', () => {
  it('keeps Add and Library compact headers search-relevant', () => {
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
  });

  it('keeps Recents compact without search actions', () => {
    assert.deepEqual(getDestinationHeaderModel('recents'), {
      hasSearchActions: false,
      showsDriveSessionMenu: true,
      title: 'Recents',
    });
  });
});
