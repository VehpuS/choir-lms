import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../test-support/rendered-text';
import { OFFLINE_STORAGE_COPY } from './model';
import { OfflineStorageSectionView } from './offline-storage-section';

const MEGABYTE = 1024 * 1024;
const SUMMARY = {
  automaticBytes: 4 * MEGABYTE,
  budgetBytes: 250 * MEGABYTE,
  keptBytes: 300 * MEGABYTE,
};

describe('OfflineStorageSectionView', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the chosen size and the two storage figures', () => {
    render(
      <OfflineStorageSectionView
        onOpenFiles={() => undefined}
        onSelectCacheSize={() => undefined}
        summary={SUMMARY}
      />,
    );

    assert.equal(screen.getByLabelText('250 MB').props['aria-checked'], true);
    assert.ok(hasRenderedText('Automatic cache: 4.0 MB of 250 MB'));
    assert.ok(hasRenderedText('300 MB kept'));
  });

  it('reports the preset size that was chosen', () => {
    const chosen: number[] = [];

    render(
      <OfflineStorageSectionView
        onOpenFiles={() => undefined}
        onSelectCacheSize={(bytes) => {
          chosen.push(bytes);
        }}
        summary={SUMMARY}
      />,
    );
    fireEvent.press(screen.getByLabelText('1 GB'));

    assert.deepEqual(chosen, [1024 * MEGABYTE]);
  });

  it('opens the offline files view from the link', () => {
    let opened = 0;

    render(
      <OfflineStorageSectionView
        onOpenFiles={() => {
          opened += 1;
        }}
        onSelectCacheSize={() => undefined}
        summary={SUMMARY}
      />,
    );
    fireEvent.press(screen.getByLabelText(OFFLINE_STORAGE_COPY.openFilesLabel));

    assert.equal(opened, 1);
  });
});
