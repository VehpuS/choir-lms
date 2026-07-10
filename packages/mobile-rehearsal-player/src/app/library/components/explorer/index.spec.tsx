import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getExplorerBackAccessibilityLabel,
  hasExplorerTrailingControls,
  resolveExplorerBreadcrumbItems,
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

  it('treats only real trailing content as explorer row controls', () => {
    assert.equal(hasExplorerTrailingControls(undefined, undefined), false);
    assert.equal(hasExplorerTrailingControls('actions', undefined), true);
    assert.equal(hasExplorerTrailingControls(undefined, 'menu'), true);
  });
});
