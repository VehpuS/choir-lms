import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getExplorerBackAccessibilityLabel,
  hasExplorerTrailingControls,
  getRowSelectionGlyph,
  interleaveExplorerRowSeparators,
  resolveExplorerBreadcrumbItems,
  resolveExplorerRowSelection,
} from './model';

describe('explorer primitives', () => {
  it('marks only ancestor breadcrumbs as pressable', () => {
    const breadcrumbs = resolveExplorerBreadcrumbItems([
      {
        key: 'library',
        label: 'Library',
        onPress: () => undefined,
      },
      {
        isCurrent: true,
        key: 'warmups',
        label: 'Warmups',
        onPress: () => undefined,
      },
    ]);

    assert.deepEqual(
      breadcrumbs.map((item) => {
        return {
          isCurrent: item.isCurrent,
          isDisabled: item.isDisabled,
          label: item.label,
        };
      }),
      [
        {
          isCurrent: false,
          isDisabled: false,
          label: 'Library',
        },
        {
          isCurrent: true,
          isDisabled: true,
          label: 'Warmups',
        },
      ],
    );
  });

  it('switches the back-button accessibility label at the Files root', () => {
    assert.equal(
      getExplorerBackAccessibilityLabel(true),
      'Go to parent folder',
    );
    assert.equal(getExplorerBackAccessibilityLabel(false), 'Already at root');
  });

  it('divides rows with separators only between them', () => {
    assert.deepEqual(
      interleaveExplorerRowSeparators(['a', 'b', 'c'], (index) => {
        return `|${index}`;
      }),
      ['a', '|1', 'b', '|2', 'c'],
    );
    assert.deepEqual(
      interleaveExplorerRowSeparators(['only'], () => '|'),
      ['only'],
    );
    assert.deepEqual(
      interleaveExplorerRowSeparators([], () => '|'),
      [],
    );
  });

  it('treats only real trailing content as explorer row controls', () => {
    assert.equal(hasExplorerTrailingControls(undefined, undefined), false);
    assert.equal(hasExplorerTrailingControls('actions', undefined), true);
    assert.equal(hasExplorerTrailingControls(undefined, 'menu'), true);
  });

  it('gives selected rows a filled accent check and unselected rows an empty circle', () => {
    const selected = getRowSelectionGlyph(true);
    const unselected = getRowSelectionGlyph(false);

    assert.equal(selected.name, 'check-circle');
    assert.equal(unselected.name, 'circle-outline');
    // The glyph shape differs, so the state never rests on color alone.
    assert.notEqual(selected.name, unselected.name);
    assert.notEqual(selected.color, unselected.color);
  });

  describe('row selection routing', () => {
    const log: string[] = [];
    const selection = (isActive: boolean, isSelected = false) => ({
      isActive,
      isSelected,
      onEnter: () => log.push('enter'),
      onToggle: () => log.push('toggle'),
    });
    const ownPress = () => log.push('own');

    it('leaves a row without selection untouched', () => {
      const resolved = resolveExplorerRowSelection(undefined, ownPress);

      assert.equal(resolved.onPress, ownPress);
      assert.equal(resolved.onLongPress, undefined);
      assert.equal(resolved.glyph, null);
      assert.equal(resolved.role, 'button');
    });

    it('keeps the row press and adds long-press entry outside selection mode', () => {
      const resolved = resolveExplorerRowSelection(selection(false), ownPress);

      assert.equal(resolved.onPress, ownPress);
      assert.equal(resolved.hidesTrailingControls, false);
      assert.equal(resolved.glyph, null);
      resolved.onLongPress?.();
      assert.deepEqual(log.splice(0), ['enter']);
    });

    it('makes a tap toggle, hides trailing controls, and swaps the glyph in selection mode', () => {
      const resolved = resolveExplorerRowSelection(
        selection(true, true),
        ownPress,
      );

      resolved.onPress?.();
      assert.deepEqual(log.splice(0), ['toggle']);
      assert.equal(resolved.onLongPress, undefined);
      assert.equal(resolved.hidesTrailingControls, true);
      assert.equal(resolved.glyph?.name, 'check-circle');
      assert.equal(resolved.isMarked, true);
    });

    it('exposes the selected state as a checkbox the web DOM can read', () => {
      const selected = resolveExplorerRowSelection(
        selection(true, true),
        undefined,
      );
      const unselected = resolveExplorerRowSelection(
        selection(true, false),
        undefined,
      );

      assert.equal(selected.role, 'checkbox');
      assert.equal(selected.ariaChecked, true);
      assert.equal(unselected.ariaChecked, false);
      assert.equal(unselected.isMarked, false);
    });
  });
});
