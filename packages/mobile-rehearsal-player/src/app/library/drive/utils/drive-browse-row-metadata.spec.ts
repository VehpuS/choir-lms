/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BROWSE_SNAPSHOT,
  PLAYABLE_SOURCE,
  UNSUPPORTED_SOURCE,
} from '../../../test-utils/library-test-fixtures.js';
import {
  UNSUPPORTED_AUDIO_FORMAT_LABEL,
  formatDriveFileSizeLabel,
  getBrowseFolderMetadataLabels,
  getBrowseSourceMetadataLabels,
} from './drive-browse-row-metadata.js';

const NOW = new Date('2026-09-29T12:00:00.000Z');
const FOLDER = BROWSE_SNAPSHOT.folders[0];

describe('Drive browse row metadata', () => {
  it('reads format, size, and duration for an audio row even when the name ends in the extension', () => {
    assert.deepEqual(
      getBrowseSourceMetadataLabels({
        ...PLAYABLE_SOURCE,
        sizeBytes: 8.4 * 1024 * 1024,
      }),
      ['MP3', '8.4 MB', '3:05'],
    );
  });

  it('omits the parts Drive did not report', () => {
    assert.deepEqual(
      getBrowseSourceMetadataLabels({
        ...PLAYABLE_SOURCE,
        durationMs: undefined,
        extension: undefined,
        name: 'Warmup',
      }),
      [],
    );
  });

  it('takes the format from the file name when Drive gives no extension', () => {
    assert.deepEqual(
      getBrowseSourceMetadataLabels({
        ...PLAYABLE_SOURCE,
        durationMs: undefined,
        extension: undefined,
        name: 'Kyrie.m4a',
      }),
      ['M4A'],
    );
  });

  it('shows the unsupported-format reason in place of the file details', () => {
    assert.deepEqual(getBrowseSourceMetadataLabels(UNSUPPORTED_SOURCE), [
      UNSUPPORTED_AUDIO_FORMAT_LABEL,
    ]);
  });

  it('formats sizes as bytes, whole kilobytes, and one-decimal megabytes and gigabytes', () => {
    assert.equal(formatDriveFileSizeLabel(512), '512 B');
    assert.equal(formatDriveFileSizeLabel(300 * 1024), '300 KB');
    assert.equal(formatDriveFileSizeLabel(6.1 * 1024 * 1024), '6.1 MB');
    assert.equal(formatDriveFileSizeLabel(2.5 * 1024 ** 3), '2.5 GB');
    assert.equal(formatDriveFileSizeLabel(undefined), undefined);
  });

  it('shows a folder updated this year as day and month, and another year with the year', () => {
    assert.deepEqual(
      getBrowseFolderMetadataLabels(
        { ...FOLDER, modifiedTime: '2026-11-03T12:00:00.000Z' },
        NOW,
      ),
      ['Updated 3 Nov'],
    );
    assert.deepEqual(
      getBrowseFolderMetadataLabels(
        { ...FOLDER, modifiedTime: '2024-05-10T12:00:00.000Z' },
        NOW,
      ),
      ['Updated 10 May 2024'],
    );
  });

  it('marks shared folders after the updated date', () => {
    assert.deepEqual(
      getBrowseFolderMetadataLabels(
        { ...FOLDER, modifiedTime: undefined, shared: true },
        NOW,
      ),
      ['Shared folder'],
    );
  });
});
