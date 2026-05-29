import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveOptionsMenuSheetActions } from '../utils/options-menu-sheet-view-model.js';

describe('options menu sheet actions', () => {
  it('normalizes multiple actions with deterministic order and default tone', () => {
    const actions = resolveOptionsMenuSheetActions([
      {
        id: 'rename',
        label: 'Rename playlist',
        onPress: () => undefined,
        tone: 'primary',
      },
      {
        id: 'remove',
        label: 'Remove playlist',
        onPress: () => undefined,
        tone: 'destructive',
      },
      {
        disabled: true,
        id: 'share',
        label: 'Share',
        onPress: () => undefined,
      },
    ]);

    assert.deepEqual(
      actions.map((action) => ({
        disabled: action.disabled ?? false,
        id: action.id,
        label: action.label,
        tone: action.tone,
      })),
      [
        {
          disabled: false,
          id: 'rename',
          label: 'Rename playlist',
          tone: 'primary',
        },
        {
          disabled: false,
          id: 'remove',
          label: 'Remove playlist',
          tone: 'destructive',
        },
        {
          disabled: true,
          id: 'share',
          label: 'Share',
          tone: 'secondary',
        },
      ],
    );
  });
});
