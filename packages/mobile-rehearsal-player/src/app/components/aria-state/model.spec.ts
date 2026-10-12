import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ariaStateProps } from './index';

describe('ariaStateProps', () => {
  it('maps busy, disabled, expanded and checked to their aria attributes', () => {
    assert.deepEqual(
      ariaStateProps({
        busy: false,
        checked: 'mixed',
        disabled: true,
        expanded: false,
      }),
      {
        'aria-busy': false,
        'aria-checked': 'mixed',
        'aria-disabled': true,
        'aria-expanded': false,
      },
    );
  });

  it('exposes a selected toggle button as aria-pressed, not the invalid aria-selected', () => {
    assert.deepEqual(ariaStateProps({ selected: true }), {
      'aria-pressed': true,
    });
    assert.deepEqual(ariaStateProps({ selected: false }, 'button'), {
      'aria-pressed': false,
    });
  });

  it('uses aria-selected for tabs and options, and aria-checked for radios and checkboxes', () => {
    assert.deepEqual(ariaStateProps({ selected: true }, 'tab'), {
      'aria-selected': true,
    });
    assert.deepEqual(ariaStateProps({ selected: true }, 'option'), {
      'aria-selected': true,
    });
    assert.deepEqual(ariaStateProps({ selected: true }, 'radio'), {
      'aria-checked': true,
    });
    assert.deepEqual(ariaStateProps({ selected: false }, 'checkbox'), {
      'aria-checked': false,
    });
  });

  it('lets an explicit checked value win over selected on a checkable role', () => {
    assert.deepEqual(
      ariaStateProps({ checked: 'mixed', selected: true }, 'checkbox'),
      { 'aria-checked': 'mixed' },
    );
  });

  it('leaves out states the control does not have', () => {
    assert.deepEqual(ariaStateProps({ disabled: false }), {
      'aria-disabled': false,
    });
    assert.deepEqual(ariaStateProps({}), {});
    assert.deepEqual(ariaStateProps(undefined), {});
    assert.deepEqual(ariaStateProps({ selected: undefined }), {});
  });
});
