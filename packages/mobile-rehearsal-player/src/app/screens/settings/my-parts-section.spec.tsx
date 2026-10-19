import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { updateMyPartsPreferences } from '../../library/sheet-music/my-parts/my-parts-store';
import { hasRenderedText } from '../../../test-support/rendered-text';
import { MyPartsSection } from './my-parts-section';

// The store is module-level state shared by every render, so each test
// starts from an empty list (storage is unavailable in node and falls back to
// memory, which is what these tests exercise).
const resetParts = () => {
  updateMyPartsPreferences({ latestPart: undefined, parts: [] });
};

const orderOf = (names: readonly string[]): string[] => {
  const tree = JSON.stringify(screen.toJSON());

  return names
    .map((name) => ({ at: tree.indexOf(`"Remove ${name}"`), name }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ name }) => name);
};

describe('MyPartsSection', () => {
  afterEach(() => {
    cleanup();
    resetParts();
  });

  it('starts on Automatic with no parts listed', () => {
    resetParts();
    render(<MyPartsSection />);

    assert.ok(hasRenderedText('Automatic'));
    assert.equal(screen.queryByLabelText('Remove Alto'), null);
  });

  it('adds a preset to the end of the list and stops offering it', () => {
    resetParts();
    render(<MyPartsSection />);

    fireEvent.press(screen.getByLabelText('Add Alto'));
    fireEvent.press(screen.getByLabelText('Add Tenor'));

    assert.deepEqual(orderOf(['Alto', 'Tenor']), ['Alto', 'Tenor']);
    // Added presets leave the quick-add chips.
    assert.equal(screen.queryByLabelText('Add Alto'), null);
    assert.ok(screen.getByLabelText('Add Bass'));
  });

  it('reorders the list with the arrows and removes a part', () => {
    resetParts();
    render(<MyPartsSection />);

    fireEvent.press(screen.getByLabelText('Add Alto'));
    fireEvent.press(screen.getByLabelText('Add Tenor'));
    fireEvent.press(screen.getByLabelText('Move Tenor up'));

    assert.deepEqual(orderOf(['Alto', 'Tenor']), ['Tenor', 'Alto']);

    fireEvent.press(screen.getByLabelText('Remove Tenor'));

    assert.deepEqual(orderOf(['Alto', 'Tenor']), ['Alto']);
  });

  it('gives each listed part the same arrows and drag handle', () => {
    updateMyPartsPreferences({ parts: ['Alto 2', 'Lead'] });
    render(<MyPartsSection />);

    for (const name of ['Alto 2', 'Lead']) {
      assert.ok(screen.getByLabelText(`Move ${name} up`));
      assert.ok(screen.getByLabelText(`Move ${name} down`));
      assert.ok(screen.getByLabelText(`Drag ${name} to reorder`));
    }
  });
});
