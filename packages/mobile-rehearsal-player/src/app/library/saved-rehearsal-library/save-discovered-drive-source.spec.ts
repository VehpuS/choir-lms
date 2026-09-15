/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioDiscoveryResult } from '@org/google-drive';

import {
  createAudio,
  DESTINATION_FOLDER_ID,
} from './drive-import-planner-test-fixtures.js';
import { saveDiscoveredDriveSource } from './save-discovered-drive-source.js';

describe('saveDiscoveredDriveSource', () => {
  it('keeps the existing save-first flow and links only after a successful save', async () => {
    const source = createAudio(
      'drive-track',
      'Warmup.mp3',
    ) as DriveAudioDiscoveryResult;
    let consumeCount = 0;
    const links: string[] = [];
    const save = (didSave: boolean) =>
      saveDiscoveredDriveSource({
        consumePendingFolderId() {
          consumeCount += 1;
          return 'nested-folder';
        },
        async linkSourceToFolder({ parentFolderId }) {
          links.push(parentFolderId);
          return true;
        },
        rootFolderId: DESTINATION_FOLDER_ID,
        saveSource: async () => didSave,
        source,
      });

    assert.equal(await save(false), false);
    assert.equal(consumeCount, 0);
    assert.deepEqual(links, []);
    assert.equal(await save(true), true);
    assert.equal(consumeCount, 1);
    assert.deepEqual(links, ['nested-folder']);
  });
});
