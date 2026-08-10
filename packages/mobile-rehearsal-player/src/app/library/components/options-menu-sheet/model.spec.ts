import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveOptionsMenuSheetActions,
  resolveOptionsMenuSheetHeading,
  resolveOptionsMenuSheetSectionDividers,
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

  it('marks a divider only where a declared section changes', () => {
    const dividers = resolveOptionsMenuSheetSectionDividers([
      { id: 'a', label: 'Play next', onPress: () => undefined, section: 'rehearsal', tone: 'secondary' },
      { id: 'b', label: 'Add to queue', onPress: () => undefined, section: 'rehearsal', tone: 'secondary' },
      { id: 'c', label: 'Rename', onPress: () => undefined, section: 'organize', tone: 'secondary' },
      { id: 'd', label: 'Move to folder', onPress: () => undefined, section: 'organize', tone: 'secondary' },
      { id: 'e', label: 'Delete from folder', onPress: () => undefined, section: 'destructive', tone: 'destructive' },
    ]);

    assert.deepEqual(dividers, [false, false, true, false, true]);
  });

  it('never shows a divider for actions without a declared section', () => {
    const dividers = resolveOptionsMenuSheetSectionDividers([
      { id: 'a', label: 'Rename playlist', onPress: () => undefined, tone: 'primary' },
      { id: 'b', label: 'Share', onPress: () => undefined, tone: 'secondary' },
      { id: 'c', label: 'Remove playlist', onPress: () => undefined, tone: 'destructive' },
    ]);

    assert.deepEqual(dividers, [false, false, false]);
  });
});
