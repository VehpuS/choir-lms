import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { MarkerFlagsLayer } from './marker-flags-layer';
import type { WaveformFlag } from './marker-flags-model';

const flag = (overrides: Partial<WaveformFlag> = {}): WaveformFlag => ({
  key: 'marker:a',
  x: 75,
  kind: 'explicit',
  name: 'Chorus',
  positionMs: 72_400,
  memberKeys: ['marker:a'],
  accessibilityLabel: 'Chorus, 1:12.4',
  ...overrides,
});

describe('MarkerFlagsLayer', () => {
  afterEach(cleanup);

  it('exposes each flag as a button named for the marker and its time', () => {
    render(
      <MarkerFlagsLayer
        flags={[
          flag(),
          flag({
            key: 'loop-1:loop-end',
            kind: 'derived',
            accessibilityLabel: 'Verse 2 end, 1:30.0',
          }),
        ]}
        width={300}
      />,
    );

    assert.equal(
      screen.getByLabelText('Chorus, 1:12.4').props.role ??
        screen.getByLabelText('Chorus, 1:12.4').props.accessibilityRole,
      'button',
    );
    assert.ok(screen.getByLabelText('Verse 2 end, 1:30.0'));
  });

  it('reports the flag that was tapped', () => {
    const tapped: string[] = [];

    render(
      <MarkerFlagsLayer
        flags={[flag()]}
        onFlagPress={(pressed) => tapped.push(pressed.key)}
        width={300}
      />,
    );
    fireEvent.press(screen.getByLabelText('Chorus, 1:12.4'));

    assert.deepEqual(tapped, ['marker:a']);
  });

  it('reports a long press on a flag separately from a tap', () => {
    const longPressed: string[] = [];
    const tapped: string[] = [];

    render(
      <MarkerFlagsLayer
        flags={[flag()]}
        onFlagLongPress={(pressed) => longPressed.push(pressed.key)}
        onFlagPress={(pressed) => tapped.push(pressed.key)}
        width={300}
      />,
    );
    fireEvent(screen.getByLabelText('Chorus, 1:12.4'), 'longPress');

    assert.deepEqual(longPressed, ['marker:a']);
    assert.deepEqual(tapped, []);
  });

  it('draws nothing for no flags', () => {
    render(<MarkerFlagsLayer flags={[]} width={300} />);

    assert.equal(screen.queryByLabelText('Chorus, 1:12.4'), null);
  });
});
