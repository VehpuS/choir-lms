import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { act, cleanup, render } from '@testing-library/react-native/pure';

import type { BulkSelectionItem } from '../selection/playback-expansion';
import { requestFolderOffline } from './folder-offline-request';
import { useFolderOfflineRequests } from './use-folder-offline-requests';

const Harness = (props: {
  keepOffline: (items: readonly BulkSelectionItem[]) => void;
  removeOffline: (items: readonly BulkSelectionItem[]) => void;
}) => {
  useFolderOfflineRequests(props);

  return null;
};

describe('folder offline requests', () => {
  afterEach(cleanup);

  it('keeps and removes the folder alone, whatever else is selected', () => {
    const calls: Array<{
      action: string;
      items: readonly BulkSelectionItem[];
    }> = [];

    render(
      <Harness
        keepOffline={(items) => calls.push({ action: 'keep', items })}
        removeOffline={(items) => calls.push({ action: 'remove', items })}
      />,
    );

    act(() => {
      requestFolderOffline({ action: 'keep-offline', folderId: 'f1' });
      requestFolderOffline({ action: 'remove-offline', folderId: 'f2' });
    });

    const folder = (folderId: string) => [
      { folderId, key: `folder:${folderId}`, kind: 'folder' },
    ];

    assert.deepEqual(calls, [
      { action: 'keep', items: folder('f1') },
      { action: 'remove', items: folder('f2') },
    ]);
  });

  it('stops listening once unmounted', () => {
    const calls: string[] = [];

    const view = render(
      <Harness
        keepOffline={() => calls.push('keep')}
        removeOffline={() => calls.push('remove')}
      />,
    );

    act(() => view.unmount());
    requestFolderOffline({ action: 'keep-offline', folderId: 'f1' });

    assert.deepEqual(calls, []);
  });
});
