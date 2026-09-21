import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import { resolveTrackMenuActions } from './files-playable-row-actions';
import { createBaseOptions, SOURCE } from './files-row-actions-test-helpers';

const SOURCE_WITH_LOCATION = {
  ...SOURCE,
  sourceLocation: {
    parentFolderId: 'folder-alto',
    parentFolderName: 'Alto',
    rootKind: 'my-drive' as const,
    path: [{ id: 'folder-alto', name: 'Alto' }],
  },
};

const createTrackRow = (
  source: typeof SOURCE = SOURCE,
): Extract<LibraryFilesRow, { kind: 'track' }> => {
  return {
    fileLink: {
      entityId: source.id,
      entityKind: 'track',
      id: `file-link:track:${source.id}`,
      parentFolderId: 'folder:library-root',
    },
    isPlayable: true,
    kind: 'track',
    label: source.name,
    source,
    supportingLabel: 'Track • 4:05',
  };
};

describe('resolveTrackMenuActions original-location actions', () => {
  it('omits Show in Add and Open in Google Drive when the source has no provenance', () => {
    const { options } = createBaseOptions();
    const actions = resolveTrackMenuActions(options, createTrackRow());

    assert.equal(
      actions.some((action) => action.label === 'Show in Add'),
      false,
    );
    assert.equal(
      actions.some((action) => action.label === 'Open in Google Drive'),
      false,
    );
  });

  it('shows both enabled actions once the source has resolved provenance', () => {
    const { calls, options } = createBaseOptions();
    const actions = resolveTrackMenuActions(
      options,
      createTrackRow(SOURCE_WITH_LOCATION),
    );
    const showInAdd = actions.find((action) => action.label === 'Show in Add');
    const openInGoogleDrive = actions.find(
      (action) => action.label === 'Open in Google Drive',
    );

    assert.ok(showInAdd);
    assert.equal(showInAdd.disabled, false);
    showInAdd.onPress();
    assert.deepEqual(calls.showInAdd, [SOURCE_WITH_LOCATION.id]);

    assert.ok(openInGoogleDrive);
    assert.equal(openInGoogleDrive.disabled, false);
    openInGoogleDrive.onPress();
    assert.deepEqual(calls.openInGoogleDrive, [SOURCE_WITH_LOCATION.id]);

    const showInAddIndex = actions.indexOf(showInAdd);
    const openInGoogleDriveIndex = actions.indexOf(openInGoogleDrive);
    assert.ok(showInAddIndex < openInGoogleDriveIndex);
  });

  it('disables both original-location actions while a resolution is pending for that source, relabeling only the pressed one', () => {
    const { options } = createBaseOptions();
    const actions = resolveTrackMenuActions(
      {
        ...options,
        pendingSourceLocationAction: {
          kind: 'show-in-add',
          sourceId: SOURCE_WITH_LOCATION.id,
        },
      },
      createTrackRow(SOURCE_WITH_LOCATION),
    );

    assert.equal(
      actions.some((action) => action.label === 'Checking Drive…'),
      true,
    );
    assert.equal(
      actions.find((action) => action.label === 'Checking Drive…')?.disabled,
      true,
    );
    assert.equal(
      actions.find((action) => action.label === 'Open in Google Drive')
        ?.disabled,
      true,
    );
    assert.equal(
      actions.some((action) => action.label === 'Show in Add'),
      false,
    );
  });

  it('leaves another source’s original-location actions enabled while a different source resolves', () => {
    const { options } = createBaseOptions();
    const actions = resolveTrackMenuActions(
      {
        ...options,
        pendingSourceLocationAction: {
          kind: 'show-in-add',
          sourceId: 'drive:some-other-file',
        },
      },
      createTrackRow(SOURCE_WITH_LOCATION),
    );

    assert.equal(
      actions.find((action) => action.label === 'Show in Add')?.disabled,
      false,
    );
  });
});
