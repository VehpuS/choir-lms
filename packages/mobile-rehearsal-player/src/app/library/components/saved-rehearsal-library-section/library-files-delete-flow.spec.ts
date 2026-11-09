import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CompositeTrack } from '@org/audio-library-models';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { requestLibraryFilesDeleteConfirmation } from './library-files-delete-flow';

const COMPOSITE: CompositeTrack = {
  createdAt: '2026-11-09T10:00:00.000Z',
  defaultMix: { levels: {} },
  id: 'composite-1',
  name: 'Seeded SATB',
  presets: [],
  stems: [
    { id: 's1', mine: false, name: 'Soprano', offsetMs: 0, trackId: 't1' },
    { id: 's2', mine: false, name: 'Bass', offsetMs: 0, trackId: 't2' },
  ],
};

const ROW: LibraryFilesRow = {
  composite: COMPOSITE,
  fileLink: {
    entityId: COMPOSITE.id,
    entityKind: 'composite',
    id: 'file-link:composite:composite-1',
    parentFolderId: 'folder:library-root',
  },
  kind: 'composite',
  label: COMPOSITE.name,
  playableItem: null,
  supportingLabel: 'Composite · 2 stems',
};

const requestCopy = (isLastLink: boolean) => {
  let message = '';
  // A lightweight fake: the flow only reads the link impact before asking.
  const files = {
    getFileLinkDeleteImpact: () => ({ isLastLink }),
  } as unknown as UseLibraryFilesResult;

  requestLibraryFilesDeleteConfirmation({
    files,
    requestConfirmation: ({ content }) => {
      message = content.message;
    },
    row: ROW,
  });

  return message;
};

describe('requestLibraryFilesDeleteConfirmation for a composite file', () => {
  it('says the stems stay as tracks when it is the last link', () => {
    const message = requestCopy(true);

    assert.match(message, /Its 2 stems stay in your library as tracks/);
  });

  it('keeps the folder-link wording when other links remain', () => {
    assert.match(requestCopy(false), /Only this folder link/);
  });
});
