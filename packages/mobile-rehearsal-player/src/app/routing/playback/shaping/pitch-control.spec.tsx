import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, fireEvent, render } from '@testing-library/react-native/pure';

import { PitchControl } from './pitch-control';

// react-native-web reports the disabled state as `aria-disabled` or `disabled`.
const isDisabled = (element: { props: Record<string, unknown> }) =>
  element.props['aria-disabled'] === true || element.props.disabled === true;

const renderControl = (disabled: boolean, onSet: (value: number) => void) =>
  render(
    <PitchControl
      canShapePitch
      disabled={disabled}
      onSetPitchSemitones={onSet}
      pitchSemitones={2}
    />,
  );

describe('PitchControl', () => {
  afterEach(() => {
    cleanup();
  });

  it('steps the pitch when enabled', () => {
    const steps: number[] = [];
    const screen = renderControl(false, (value) => steps.push(value));

    fireEvent.press(screen.getByLabelText('Raise pitch by one semitone'));

    assert.deepEqual(steps, [3]);
  });

  it('disables both step buttons while locked', () => {
    const screen = renderControl(true, () => undefined);

    assert.equal(
      isDisabled(screen.getByLabelText('Raise pitch by one semitone')),
      true,
    );
    assert.equal(
      isDisabled(screen.getByLabelText('Lower pitch by one semitone')),
      true,
    );
  });
});
