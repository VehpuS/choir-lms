import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { PdfLayoutOptions } from './pdf-layout-options';
import { buildPdfLayoutSheetModel } from './pdf-layout-sheet-model';

const renderOptions = (
  input: Parameters<typeof buildPdfLayoutSheetModel>[0],
  overrides: Partial<Parameters<typeof PdfLayoutOptions>[0]> = {},
) =>
  render(
    <PdfLayoutOptions
      isOnlyForThisFile={false}
      model={buildPdfLayoutSheetModel(input)}
      onSelect={() => undefined}
      onToggleOnlyForThisFile={() => undefined}
      onUseDeviceLayout={() => undefined}
      {...overrides}
    />,
  );

describe('PdfLayoutOptions', () => {
  afterEach(cleanup);

  it('offers the three layouts and marks the current one', () => {
    renderOptions({ deviceLayout: 'pages', ownLayout: undefined });

    assert.ok(screen.getByLabelText('Scroll'));
    assert.ok(screen.getByLabelText('Pages, current'));
    assert.ok(screen.getByLabelText('Strip'));
    assert.ok(hasRenderedText('Current'));
  });

  it('reports the layout that is pressed', () => {
    const chosen: string[] = [];

    renderOptions(
      { deviceLayout: 'scroll', ownLayout: undefined },
      { onSelect: (layout) => chosen.push(layout) },
    );
    fireEvent.press(screen.getByLabelText('Strip'));

    assert.deepEqual(chosen, ['strip']);
  });

  it('shows the Only for this file switch, off by default, and reports a toggle', () => {
    const toggles: boolean[] = [];

    renderOptions(
      { deviceLayout: 'scroll', ownLayout: undefined },
      { onToggleOnlyForThisFile: (value) => toggles.push(value) },
    );
    const control = screen.getByLabelText('Only for this file');

    fireEvent(control, 'valueChange', true);

    assert.deepEqual(toggles, [true]);
  });

  it('has no own-layout note or reset for a file that follows the device', () => {
    renderOptions({ deviceLayout: 'scroll', ownLayout: undefined });

    assert.equal(hasRenderedText('This file uses its own layout'), false);
    assert.equal(hasRenderedText('Use the device layout'), false);
  });

  it('says a file uses its own layout and lets the user return to the device layout', () => {
    let reset = 0;

    renderOptions(
      { deviceLayout: 'pages', ownLayout: 'strip' },
      { onUseDeviceLayout: () => (reset += 1) },
    );

    assert.ok(hasRenderedText('This file uses its own layout'));
    assert.ok(screen.getByLabelText('Strip, current'));
    fireEvent.press(screen.getByLabelText('Use the device layout'));
    assert.equal(reset, 1);
  });

  it('explains a device change that leaves the file as it was', () => {
    renderOptions({
      changedDeviceTo: 'pages',
      deviceLayout: 'pages',
      ownLayout: 'strip',
    });

    assert.ok(hasRenderedText('Device layout changed to Pages.'));
    assert.ok(screen.getByLabelText('Strip, current'));
  });
});
