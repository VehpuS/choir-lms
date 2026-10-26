import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../test-support/rendered-text';
import { MY_PARTS_COPY, SETTINGS_COPY } from './model';
import { SettingsScreen } from './index';
import { settingsNavigationStore } from './settings-navigation-store';

describe('SettingsScreen', () => {
  afterEach(() => {
    cleanup();
    settingsNavigationStore.close();
  });

  it('shows the category list first, without any category options', () => {
    render(<SettingsScreen />);

    assert.ok(screen.getByLabelText('Bulk selections'));
    assert.ok(screen.getByLabelText('My parts'));
    assert.ok(screen.getByLabelText('Search sources'));
    assert.equal(hasRenderedText(MY_PARTS_COPY.emptyLabel), false);
    assert.equal(screen.queryByLabelText(SETTINGS_COPY.backLabel), null);
  });

  it('opens one category page and returns to the list on back', () => {
    render(<SettingsScreen />);

    // My parts is used because the Bulk selections page reads AsyncStorage,
    // which needs a browser `window` that node does not have.
    fireEvent.press(screen.getByLabelText('My parts'));

    assert.ok(hasRenderedText(MY_PARTS_COPY.emptyLabel));
    assert.equal(screen.queryByLabelText('Search sources'), null);

    fireEvent.press(screen.getByLabelText(SETTINGS_COPY.backLabel));

    assert.ok(screen.getByLabelText('Search sources'));
    assert.equal(hasRenderedText(MY_PARTS_COPY.emptyLabel), false);
  });
});
