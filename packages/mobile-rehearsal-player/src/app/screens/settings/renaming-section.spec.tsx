import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { cleanup, fireEvent, render } from '@testing-library/react-native/pure';

import { trackRenameChoiceStore } from '../../library/saved-rehearsal-library/track-rename-choice-store';
import { RENAMING_COPY } from './model';
import {
  RenamingSection,
  renamingChoiceFromValue,
  renamingOptionValue,
} from './renaming-section';

afterEach(cleanup);

describe('renaming settings value mapping', () => {
  it('shows no stored choice as ask each time', () => {
    assert.equal(renamingOptionValue(null), 'ask');
    assert.equal(renamingOptionValue('all'), 'all');
    assert.equal(renamingOptionValue('this'), 'this');
  });

  it('clears the stored choice for ask each time', () => {
    assert.equal(renamingChoiceFromValue('ask'), null);
    assert.equal(renamingChoiceFromValue('all'), 'all');
    assert.equal(renamingChoiceFromValue('this'), 'this');
  });
});

describe('RenamingSection', () => {
  it('lists the three answers for the rename prompt', () => {
    const screen = render(<RenamingSection />);

    assert.ok(screen.getByLabelText(RENAMING_COPY.rowTitle));
    assert.ok(screen.getByLabelText('Ask each time'));
    assert.ok(screen.getByLabelText('All copies'));
    assert.ok(screen.getByLabelText('This copy only'));
  });

  it('stores a chosen answer and clears it again', async () => {
    const screen = render(<RenamingSection />);

    fireEvent.press(screen.getByLabelText('All copies'));
    await trackRenameChoiceStore.hydrate();
    assert.equal(trackRenameChoiceStore.getSnapshot(), 'all');

    fireEvent.press(screen.getByLabelText('Ask each time'));
    // `set` publishes after its (already settled) hydrate resolves.
    await trackRenameChoiceStore.hydrate();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(trackRenameChoiceStore.getSnapshot(), null);
  });
});
