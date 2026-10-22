import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../../test-support/rendered-text';
import { MarkerRow, resolveMarkerRowLabel } from './marker-row';
import type { MarkerRow as MarkerRowModel } from './model';

const buildRow = (overrides: Partial<MarkerRowModel> = {}): MarkerRowModel => ({
  key: 'marker:a',
  name: 'Chorus',
  timeLabel: '1:12.4',
  positionMs: 72_400,
  origin: 'explicit',
  isPastEnd: false,
  canJump: true,
  actions: ['rename', 'move', 'delete'],
  markerId: 'a',
  ...overrides,
});

type RenderOptions = {
  isChecked?: boolean;
  isSelecting?: boolean;
  row?: MarkerRowModel;
};

const renderRow = (options: RenderOptions = {}) => {
  const calls = { menu: 0, press: 0 };

  render(
    <MarkerRow
      isChecked={options.isChecked ?? false}
      isSelecting={options.isSelecting ?? false}
      onOpenMenu={() => (calls.menu += 1)}
      onPress={() => (calls.press += 1)}
      row={options.row ?? buildRow()}
    />,
  );

  return calls;
};

describe('MarkerRow', () => {
  afterEach(cleanup);

  it('labels the row with its name and time for assistive technology', () => {
    assert.equal(resolveMarkerRowLabel(buildRow()), 'Chorus, 1:12.4');
  });

  it('shows the name and time and jumps when pressed', () => {
    const calls = renderRow();

    assert.ok(hasRenderedText('Chorus'));
    assert.ok(hasRenderedText('1:12.4'));

    fireEvent.press(screen.getByLabelText('Chorus, 1:12.4'));

    assert.equal(calls.press, 1);
  });

  it('opens the action menu from the trailing button', () => {
    const calls = renderRow();

    fireEvent.press(screen.getByLabelText('Actions for Chorus'));

    assert.equal(calls.menu, 1);
  });

  it('explains a marker past the end and disables the jump', () => {
    renderRow({
      row: buildRow({
        isPastEnd: true,
        canJump: false,
        pastEndMessage: 'Past the end of this audio',
      }),
    });

    assert.ok(hasRenderedText('Past the end of this audio'));
    assert.equal(
      screen.getByLabelText('Chorus, 1:12.4. Past the end of this audio').props[
        'aria-disabled'
      ],
      true,
    );
    // It can still be edited.
    assert.ok(screen.getByLabelText('Actions for Chorus'));
  });

  it('marks loop boundaries as such', () => {
    renderRow({
      row: buildRow({
        origin: 'loop-start',
        name: 'Verse 2 start',
        actions: ['open-loop', 'keep-as-marker'],
      }),
    });

    assert.ok(hasRenderedText('Loop boundary'));
  });

  it('shows a checkbox instead of the menu in select mode', () => {
    const calls = renderRow({ isChecked: true, isSelecting: true });
    const checkbox = screen.getByLabelText('Chorus, 1:12.4');

    assert.equal(checkbox.props['aria-checked'], true);
    assert.equal(screen.queryByLabelText('Actions for Chorus'), null);

    fireEvent.press(checkbox);
    assert.equal(calls.press, 1);
  });

  it('hides the menu button when the row has no actions', () => {
    renderRow({ row: buildRow({ actions: [] }) });

    assert.equal(screen.queryByLabelText('Actions for Chorus'), null);
  });
});
