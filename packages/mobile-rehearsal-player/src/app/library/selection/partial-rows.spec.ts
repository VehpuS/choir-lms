import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectAncestorIds, getPartialRowIds } from './partial-rows.js';

const none = new Set<string>();

describe('partial rows', () => {
  it('collects ancestors at every depth and tolerates items without a path', () => {
    assert.deepEqual(
      [...collectAncestorIds([['a', 'b'], ['a', 'c'], undefined, []])].sort(),
      ['a', 'b', 'c'],
    );
  });

  it('marks a folder with a selected item beneath it, at any depth', () => {
    const partial = getPartialRowIds({
      ancestorIds: collectAncestorIds([['top', 'mid']]),
      coveredIds: none,
      rowIds: ['top', 'mid', 'other'],
      selectedIds: new Set(['file']),
    });

    assert.deepEqual([...partial].sort(), ['mid', 'top']);
  });

  it('leaves selected and covered folders out', () => {
    const partial = getPartialRowIds({
      ancestorIds: new Set(['selected', 'covered', 'plain']),
      coveredIds: new Set(['covered']),
      rowIds: ['selected', 'covered', 'plain'],
      selectedIds: new Set(['selected']),
    });

    assert.deepEqual([...partial], ['plain']);
  });

  it('returns a folder to partial once it is deselected but its inner items stay', () => {
    const ancestorIds = collectAncestorIds([['folder']]);
    const rowIds = ['folder'];

    assert.equal(
      getPartialRowIds({
        ancestorIds,
        coveredIds: none,
        rowIds,
        selectedIds: new Set(['folder', 'inner']),
      }).size,
      0,
    );
    assert.deepEqual(
      [
        ...getPartialRowIds({
          ancestorIds,
          coveredIds: none,
          rowIds,
          selectedIds: new Set(['inner']),
        }),
      ],
      ['folder'],
    );
  });

  it('is empty when nothing is selected beneath any row', () => {
    assert.equal(
      getPartialRowIds({
        ancestorIds: none,
        coveredIds: none,
        rowIds: ['a'],
        selectedIds: none,
      }).size,
      0,
    );
  });
});
