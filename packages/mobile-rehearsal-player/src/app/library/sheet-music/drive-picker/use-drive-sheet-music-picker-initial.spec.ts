/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SHARED_FOLDERS_ROOT_LOCATION } from '@org/google-drive';
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import type { DrivePickerNavigation } from './model.js';
import {
  useDriveSheetMusicPicker,
  type DriveSheetMusicClient,
} from './use-drive-sheet-music-picker.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useDriveSheetMusicPicker initial navigation', () => {
  it('opens at the given folder instead of My Drive', async () => {
    const browsed: string[] = [];
    // Answers never arrive: only where the first request goes is under test.
    const client: DriveSheetMusicClient = {
      browse: (options) => {
        browsed.push(options.location.id);

        return new Promise(() => undefined);
      },
      search: () => new Promise(() => undefined),
    };
    const initialNavigation: DrivePickerNavigation = {
      stack: [
        SHARED_FOLDERS_ROOT_LOCATION,
        { id: 'scores', kind: 'folder', name: 'Scores', rootKind: 'shared' },
      ],
    };
    let stackLength = 0;
    const Harness = () => {
      stackLength = useDriveSheetMusicPicker({
        accessToken: 'token',
        client,
        initialNavigation,
      }).navigation.stack.length;

      return null;
    };

    await act(async () => {
      create(createElement(Harness));
    });

    assert.deepEqual(browsed, ['scores']);
    assert.equal(stackLength, 2);
  });
});
