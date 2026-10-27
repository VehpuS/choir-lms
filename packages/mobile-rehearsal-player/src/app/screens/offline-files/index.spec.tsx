import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../test-support/rendered-text';
import { buildOfflineStorageSnapshot } from '../../library/offline/offline-storage-model';
import type { OfflineStorageService } from '../../library/offline/offline-storage-service';
import type { AudioStoreEntry } from '../../library/playback/audio-cache/audio-store-types';
import { pinnedBulkBarStore } from '../../library/selection/pinned-bulk-bar-store';
import { OfflineFilesContent } from './index';
import { OFFLINE_FILES_COPY } from './model';

const MEGABYTE = 1024 * 1024;

const entry = (overrides: Partial<AudioStoreEntry>): AudioStoreEntry => ({
  driveFileId: 'a',
  name: 'Alto.mp3',
  sizeBytes: 3 * MEGABYTE,
  sourceVersion: 'v1',
  touchedAt: 1,
  ...overrides,
});

const snapshotOf = (entries: AudioStoreEntry[]) => {
  return buildOfflineStorageSnapshot({
    budgetBytes: 250 * MEGABYTE,
    entries,
    libraryNames: new Map(),
    sort: 'recent',
  });
};

// A plain stand-in: the removal behavior itself is covered by the service spec.
const fakeService = (): OfflineStorageService => ({
  clearAll: async () => undefined,
  clearAutomatic: async () => undefined,
  list: async () => [],
  removeMany: async () => undefined,
});

const renderView = (
  entries: AudioStoreEntry[],
  handlers: { onSortChange?: (sort: 'recent' | 'size') => void } = {},
) => {
  return render(
    <OfflineFilesContent
      isLoading={false}
      onSortChange={handlers.onSortChange ?? (() => undefined)}
      service={fakeService()}
      snapshot={snapshotOf(entries)}
      sort="recent"
    />,
  );
};

describe('OfflineFilesContent', () => {
  afterEach(() => {
    cleanup();
  });

  it('lists kept and automatic files with their sizes and the two totals', () => {
    renderView([
      entry({ driveFileId: 'kept', name: 'Kept.mp3', pinned: true }),
      entry({ driveFileId: 'auto', name: 'Auto.mp3', sizeBytes: MEGABYTE }),
    ]);

    assert.ok(hasRenderedText(OFFLINE_FILES_COPY.keptTitle));
    assert.ok(hasRenderedText(OFFLINE_FILES_COPY.automaticTitle));
    assert.ok(screen.getByLabelText('Kept.mp3, 3.0 MB'));
    assert.ok(screen.getByLabelText('Auto.mp3, 1.0 MB'));
    assert.ok(hasRenderedText('Automatic cache: 1.0 MB of 250 MB'));
    assert.ok(hasRenderedText('3.0 MB kept'));
  });

  it('explains how to keep a file when nothing is stored', () => {
    renderView([]);

    assert.ok(hasRenderedText(OFFLINE_FILES_COPY.emptyTitle));
    assert.equal(screen.queryByLabelText('Select'), null);
    assert.equal(screen.queryByLabelText('Clear all'), null);
  });

  it('reports a sort change', () => {
    const chosen: string[] = [];

    renderView([entry({})], {
      onSortChange: (sort) => {
        chosen.push(sort);
      },
    });
    fireEvent.press(screen.getByLabelText('Size'));

    assert.deepEqual(chosen, ['size']);
  });

  it('selects a row and pins a remove action for the selection', () => {
    renderView([entry({}), entry({ driveFileId: 'b', name: 'Bass.mp3' })]);
    fireEvent.press(screen.getByLabelText('Alto.mp3, 3.0 MB'));

    assert.ok(hasRenderedText('1 selected'));
    const bar = pinnedBulkBarStore.getSnapshot();

    assert.equal(bar?.overflowTitle, '1 selected');
    assert.equal(bar?.actions[0]?.id, 'remove-offline');
    assert.equal(bar?.actions[0]?.isDisabled, false);
  });

  it('withdraws the pinned bar when the selection is cancelled', () => {
    renderView([entry({})]);
    fireEvent.press(screen.getByLabelText('Alto.mp3, 3.0 MB'));
    fireEvent.press(screen.getByLabelText('Cancel'));

    assert.equal(pinnedBulkBarStore.getSnapshot(), null);
  });

  it('selects every file with Select all', () => {
    renderView([entry({}), entry({ driveFileId: 'b', name: 'Bass.mp3' })]);
    fireEvent.press(screen.getByLabelText('Alto.mp3, 3.0 MB'));
    act(() => {
      fireEvent.press(screen.getByLabelText('Select all'));
    });

    assert.ok(hasRenderedText('2 selected'));
  });
});
