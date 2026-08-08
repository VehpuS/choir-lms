import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveOptionsMenuSheetActions,
  resolveOptionsMenuSheetHeading,
} from './model.js';

describe('options menu sheet actions', () => {
  it('keeps the affected item as the only visible sheet heading', () => {
    assert.deepEqual(resolveOptionsMenuSheetHeading('Browser Test Folder'), {
      eyebrow: undefined,
      title: 'Browser Test Folder',
    });
  });

  it('puts primary actions first, preserves relative tone-group order, and keeps destructive actions last', () => {
    const actions = resolveOptionsMenuSheetActions([
      {
        disabled: true,
        id: 'share',
        label: 'Share',
        onPress: () => undefined,
      },
      {
        id: 'rename',
        label: 'Rename playlist',
        onPress: () => undefined,
        tone: 'primary',
      },
      {
        id: 'queue-next',
        label: 'Play next',
        onPress: () => undefined,
      },
      {
        id: 'remove',
        label: 'Remove playlist',
        onPress: () => undefined,
        tone: 'destructive',
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
          disabled: true,
          id: 'share',
          label: 'Share',
          tone: 'secondary',
        },
        {
          disabled: false,
          id: 'queue-next',
          label: 'Play next',
          tone: 'secondary',
        },
        {
          disabled: false,
          id: 'remove',
          label: 'Remove playlist',
          tone: 'destructive',
        },
      ],
    );
  });
});
