import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { OfflineFileRow } from '../../library/offline/offline-storage-model';
import {
  getAutomaticUsageLabel,
  getClearAllConfirmation,
  getKeptUsageLabel,
  getRemoveSelectionConfirmation,
} from './model.js';

const MEGABYTE = 1024 * 1024;
const row = (overrides: Partial<OfflineFileRow>): OfflineFileRow => ({
  driveFileId: 'a',
  kept: false,
  name: 'A',
  sizeBytes: MEGABYTE,
  touchedAt: 1,
  ...overrides,
});

describe('offline files copy', () => {
  it('reads the automatic cache against its size and the kept total apart', () => {
    const summary = {
      automaticBytes: 4 * MEGABYTE,
      budgetBytes: 250 * MEGABYTE,
      keptBytes: 300 * MEGABYTE,
    };

    assert.equal(getAutomaticUsageLabel(summary), '4.0 MB of 250 MB');
    assert.equal(getKeptUsageLabel(summary), '300 MB kept');
    assert.equal(
      getAutomaticUsageLabel({ ...summary, budgetBytes: 1024 * MEGABYTE }),
      '4.0 MB of 1 GB',
    );
  });

  it('names the count, the size freed and any kept files being removed', () => {
    const content = getRemoveSelectionConfirmation([
      row({ kept: true }),
      row({ driveFileId: 'b' }),
    ]);

    assert.equal(content.title, 'Remove 2 files from offline?');
    assert.match(content.message, /frees 2\.0 MB/);
    assert.match(content.message, /including 1 file you kept offline/);
    assert.match(content.message, /Kept files will stream again/);
  });

  it('keeps the plain streaming note when no kept file is selected', () => {
    const { message } = getRemoveSelectionConfirmation([row({})]);

    assert.doesNotMatch(message, /kept/);
    assert.match(message, /play or keep them offline/);
  });

  it('says clear all includes kept files', () => {
    assert.match(
      getClearAllConfirmation([row({})]).message,
      /including files you kept offline/,
    );
  });
});
