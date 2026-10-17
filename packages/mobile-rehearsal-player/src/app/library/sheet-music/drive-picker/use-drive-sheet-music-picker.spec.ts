/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SHARED_FOLDERS_ROOT_LOCATION,
  type DriveSheetMusicListing,
} from '@org/google-drive';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import {
  useDriveSheetMusicPicker,
  type DriveSheetMusicClient,
} from './use-drive-sheet-music-picker.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Call = {
  kind: 'browse' | 'search';
  locationId?: string;
  onProgress?: (listing: DriveSheetMusicListing) => void;
  query?: string;
  reject: (error: unknown) => void;
  resolve: (listing: DriveSheetMusicListing) => void;
  signal: AbortSignal | undefined;
};

// A client the spec controls: each request waits until the spec answers it,
// which stands in for Drive, so ordering and cancellation can be exercised.
const createControlledClient = () => {
  const calls: Call[] = [];
  const ask = (
    kind: Call['kind'],
    extra: Pick<Call, 'locationId' | 'onProgress' | 'query'>,
    signal: AbortSignal | undefined,
  ) =>
    new Promise<DriveSheetMusicListing>((resolve, reject) => {
      calls.push({ ...extra, kind, reject, resolve, signal });
    });
  const client: DriveSheetMusicClient = {
    browse: (options) =>
      ask(
        'browse',
        { locationId: options.location.id, onProgress: options.onProgress },
        options.signal,
      ),
    search: (options) =>
      ask(
        'search',
        {
          locationId: options.location?.id,
          onProgress: options.onProgress,
          query: options.query,
        },
        options.signal,
      ),
  };

  return { calls, client };
};

const LISTING: DriveSheetMusicListing = {
  files: [
    {
      format: 'pdf',
      id: 'file-1',
      mimeType: 'application/pdf',
      name: 'Kyrie.pdf',
    },
  ],
  folders: [
    { id: 'folder-1', name: 'Scores', rootKind: 'my-drive', shared: false },
  ],
};

const renderHook = async (
  accessToken: string | undefined,
  client: DriveSheetMusicClient,
) => {
  const box: {
    current: ReturnType<typeof useDriveSheetMusicPicker> | null;
    renderer: ReactTestRenderer | null;
  } = { current: null, renderer: null };
  const Harness = () => {
    box.current = useDriveSheetMusicPicker({ accessToken, client });

    return null;
  };

  await act(async () => {
    box.renderer = create(createElement(Harness));
  });

  return box;
};

const statusOf = (box: {
  current: ReturnType<typeof useDriveSheetMusicPicker> | null;
}) => box.current?.state.status;

describe('useDriveSheetMusicPicker', () => {
  it('browses My Drive on open and shows the listing', async () => {
    const { calls, client } = createControlledClient();
    const box = await renderHook('token', client);

    assert.equal(statusOf(box), 'loading');
    assert.deepEqual(
      calls.map(({ kind, locationId }) => [kind, locationId]),
      [['browse', 'root']],
    );

    await act(async () => calls[0]?.resolve(LISTING));

    assert.deepEqual(box.current?.state, {
      isLoadingMore: false,
      listing: LISTING,
      status: 'ready',
    });
  });

  it('asks for Drive access without a request when there is no token', async () => {
    const { calls, client } = createControlledClient();
    const box = await renderHook(undefined, client);

    assert.equal(calls.length, 0);
    assert.deepEqual(box.current?.state, {
      reason: 'needs-drive-access',
      status: 'failed',
    });
  });

  it('opens a folder, cancels the first request, and ignores its late answer', async () => {
    const { calls, client } = createControlledClient();
    const box = await renderHook('token', client);

    await act(async () => {
      box.current?.openFolder({
        id: 'folder-1',
        name: 'Scores',
        rootKind: 'my-drive',
      });
    });

    assert.equal(calls[0]?.signal?.aborted, true);
    assert.equal(calls[1]?.locationId, 'folder-1');

    await act(async () => calls[0]?.resolve({ files: [], folders: [] }));
    assert.equal(statusOf(box), 'loading');

    await act(async () => calls[1]?.resolve(LISTING));
    assert.equal(statusOf(box), 'ready');
  });

  it('goes back up to the parent folder', async () => {
    const { calls, client } = createControlledClient();
    const box = await renderHook('token', client);

    await act(async () => {
      box.current?.openFolder({
        id: 'folder-1',
        name: 'Scores',
        rootKind: 'my-drive',
      });
    });
    await act(async () => {
      box.current?.goUp();
    });

    assert.deepEqual(
      calls.map(({ locationId }) => locationId),
      ['root', 'folder-1', 'root'],
    );
  });

  it('searches by name, and leaving the search browses the folder again', async () => {
    const { calls, client } = createControlledClient();
    const box = await renderHook('token', client);

    await act(async () => {
      box.current?.search('kyrie');
    });
    assert.deepEqual([calls[1]?.kind, calls[1]?.query], ['search', 'kyrie']);

    await act(async () => {
      box.current?.search('');
    });
    assert.equal(calls[2]?.kind, 'browse');
  });

  it('switches to the shared root and clears the search', async () => {
    const { calls, client } = createControlledClient();
    const box = await renderHook('token', client);

    await act(async () => {
      box.current?.search('kyrie');
    });
    await act(async () => {
      box.current?.switchRoot(SHARED_FOLDERS_ROOT_LOCATION);
    });

    assert.equal(calls[2]?.kind, 'browse');
    assert.equal(calls[2]?.locationId, SHARED_FOLDERS_ROOT_LOCATION.id);
  });

  it('reports a rejected token as needing Drive access and a network error as unavailable', async () => {
    const { calls, client } = createControlledClient();
    const box = await renderHook('token', client);

    await act(async () =>
      calls[0]?.reject(new Error('Drive request failed: 401')),
    );
    assert.deepEqual(box.current?.state, {
      reason: 'needs-drive-access',
      status: 'failed',
    });

    await act(async () => {
      box.current?.retry();
    });
    await act(async () => calls[1]?.reject(new TypeError('Failed to fetch')));
    assert.deepEqual(box.current?.state, {
      reason: 'unavailable',
      status: 'failed',
    });
  });

  it('asks again on retry', async () => {
    const { calls, client } = createControlledClient();
    const box = await renderHook('token', client);

    await act(async () => calls[0]?.reject(new TypeError('Failed to fetch')));
    await act(async () => {
      box.current?.retry();
    });

    assert.equal(calls.length, 2);
    assert.equal(statusOf(box), 'loading');
  });

  it('cancels the request when the picker closes', async () => {
    const { calls, client } = createControlledClient();
    const box = await renderHook('token', client);

    await act(async () => {
      box.renderer?.unmount();
    });

    assert.equal(calls[0]?.signal?.aborted, true);
  });

  it('shows the first page of a folder while the rest is still loading', async () => {
    const { calls, client } = createControlledClient();
    const box = await renderHook('token', client);

    await act(async () => calls[0]?.onProgress?.(LISTING));
    assert.deepEqual(box.current?.state, {
      isLoadingMore: true,
      listing: LISTING,
      status: 'ready',
    });

    await act(async () => calls[0]?.resolve(LISTING));
    assert.deepEqual(box.current?.state, {
      isLoadingMore: false,
      listing: LISTING,
      status: 'ready',
    });
  });

  it('searches all of Drive from a root, where there is no folder to follow', async () => {
    const { calls, client } = createControlledClient();
    const box = await renderHook('token', client);

    await act(async () => {
      box.current?.search('kyrie');
    });

    assert.equal(box.current?.searchScope, 'everywhere');
    assert.equal(calls[1]?.locationId, undefined);
  });

  it('searches the folder being browsed, and widens to all of Drive on request', async () => {
    const { calls, client } = createControlledClient();
    const box = await renderHook('token', client);

    await act(async () => {
      box.current?.openFolder({
        id: 'folder-1',
        name: 'Scores',
        rootKind: 'my-drive',
      });
    });
    await act(async () => {
      box.current?.search('kyrie');
    });

    assert.equal(box.current?.searchScope, 'folder');
    assert.deepEqual(
      [calls[2]?.kind, calls[2]?.locationId],
      ['search', 'folder-1'],
    );

    await act(async () => {
      box.current?.setSearchScope('everywhere');
    });

    assert.equal(calls[2]?.signal?.aborted, true);
    assert.deepEqual(
      [calls[3]?.kind, calls[3]?.locationId, calls[3]?.query],
      ['search', undefined, 'kyrie'],
    );

    await act(async () => {
      box.current?.setSearchScope('folder');
    });
    assert.equal(calls[4]?.locationId, 'folder-1');
  });

  it('goes back to following the folder when another folder is opened', async () => {
    const { client } = createControlledClient();
    const box = await renderHook('token', client);

    await act(async () => {
      box.current?.openFolder({
        id: 'folder-1',
        name: 'Scores',
        rootKind: 'my-drive',
      });
    });
    await act(async () => {
      box.current?.setSearchScope('everywhere');
    });
    assert.equal(box.current?.searchScope, 'everywhere');

    await act(async () => {
      box.current?.openFolder({
        id: 'folder-2',
        name: 'Mass',
        rootKind: 'my-drive',
      });
    });

    assert.equal(box.current?.searchScope, 'folder');
  });
});
