/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getSelectionCountLabel,
  resolveBulkActionPress,
  splitBulkActions,
  type BulkAction,
} from './bulk-action-model.js';

const action = (
  id: string,
  overrides: Partial<BulkAction> = {},
): BulkAction => ({
  id,
  label: id,
  onPress: () => undefined,
  ...overrides,
});

describe('bulk action model', () => {
  it('keeps three actions on the bar and moves the rest to overflow in order', () => {
    const split = splitBulkActions(
      ['a', 'b', 'c', 'd', 'e'].map((id) => action(id)),
    );

    assert.deepEqual(
      split.visible.map(({ id }) => id),
      ['a', 'b', 'c'],
    );
    assert.deepEqual(
      split.overflow.map(({ id }) => id),
      ['d', 'e'],
    );
  });

  it('has no overflow when the actions fit', () => {
    const split = splitBulkActions([action('a'), action('b')]);

    assert.equal(split.visible.length, 2);
    assert.equal(split.overflow.length, 0);
  });

  it('runs an enabled action', () => {
    assert.deepEqual(resolveBulkActionPress(action('a')), { kind: 'run' });
  });

  it('explains a disabled action with its own reason instead of running it', () => {
    assert.deepEqual(
      resolveBulkActionPress(
        action('a', {
          disabledReason: 'Folders cannot be copied.',
          isDisabled: true,
        }),
      ),
      { kind: 'explain', message: 'Folders cannot be copied.' },
    );
  });

  it('falls back to a generic explanation when no reason was given', () => {
    const outcome = resolveBulkActionPress(action('a', { isDisabled: true }));

    assert.equal(outcome.kind, 'explain');
  });

  it('labels the selection count', () => {
    assert.equal(getSelectionCountLabel(0), 'Nothing selected');
    assert.equal(getSelectionCountLabel(4), '4 selected');
  });
});
