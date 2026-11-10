import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RehearsalLibraryFileLinkNode } from '@org/audio-library-models';

import { SOURCE } from '../components/saved-rehearsal-library-section/files-row-actions-test-helpers';
import type { LibraryFilesRow } from './library-files-model';
import { countTrackCopies, planFilesRename } from './track-rename-model';

const link = (
  id: string,
  entityId = SOURCE.id,
): RehearsalLibraryFileLinkNode => ({
  entityId,
  entityKind: 'track',
  id,
  parentFolderId: 'root',
});

const trackRow = (fileLink: RehearsalLibraryFileLinkNode) =>
  ({
    fileLink,
    kind: 'track',
    label: SOURCE.name,
    source: SOURCE,
  }) as unknown as LibraryFilesRow;

describe('planFilesRename', () => {
  it('renames the track with its only copy', () => {
    const fileLinks = [link('a'), link('b', 'other-track')];

    assert.equal(
      planFilesRename({
        fileLinks,
        remembered: null,
        row: trackRow(fileLinks[0]),
      }),
      'track-and-copies',
    );
  });

  it('asks when the track has several copies and nothing is remembered', () => {
    const fileLinks = [link('a'), link('b')];

    assert.equal(countTrackCopies(fileLinks, SOURCE.id), 2);
    assert.equal(
      planFilesRename({
        fileLinks,
        remembered: null,
        row: trackRow(fileLinks[0]),
      }),
      'ask',
    );
  });

  it('follows the remembered choice without asking', () => {
    const fileLinks = [link('a'), link('b')];
    const row = trackRow(fileLinks[0]);

    assert.equal(
      planFilesRename({ fileLinks, remembered: 'all', row }),
      'track-and-copies',
    );
    assert.equal(
      planFilesRename({ fileLinks, remembered: 'this', row }),
      'copy-only',
    );
  });

  it('only renames the link for rows that are not tracks', () => {
    const row = { kind: 'folder' } as unknown as LibraryFilesRow;

    assert.equal(
      planFilesRename({ fileLinks: [], remembered: null, row }),
      'copy-only',
    );
  });
});
