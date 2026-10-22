import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { AllowSavingStep } from './allow-saving-step';
import { describeAllowSavingStep } from './allow-saving-step-model';

const stepFor = (hasAskedForPermission: boolean) => {
  const step = describeAllowSavingStep({
    hasAskedForPermission,
    hasWriteAccess: false,
  });

  assert.notEqual(step.state, 'ready');

  return step as Exclude<typeof step, { state: 'ready' }>;
};

describe('AllowSavingStep', () => {
  afterEach(cleanup);

  it('shows the permission request and starts sign-in when pressed', () => {
    let allowed = 0;

    render(
      <AllowSavingStep
        isBusy={false}
        onAllow={() => (allowed += 1)}
        step={stepFor(false)}
      />,
    );

    assert.ok(hasRenderedText('Allow saving to Drive'));
    fireEvent.press(screen.getByLabelText('Allow saving'));
    assert.equal(allowed, 1);
  });

  it('says what was missing after a decline and offers to try again', () => {
    render(
      <AllowSavingStep
        isBusy={false}
        onAllow={() => undefined}
        step={stepFor(true)}
      />,
    );

    assert.ok(hasRenderedText('Saving to Drive was not allowed'));
    assert.ok(screen.getByLabelText('Try again'));
  });

  it('disables the action while sign-in is running', () => {
    render(
      <AllowSavingStep
        isBusy
        onAllow={() => undefined}
        step={stepFor(false)}
      />,
    );

    assert.equal(
      screen.getByLabelText('Allow saving').props['aria-disabled'],
      true,
    );
  });
});
