/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { APP_ICON_GLYPHS } from '../../../components/app-icon/model.js';
import { BULK_ACTION_LABELS } from '../../selection/bulk-action-resolution.js';
import { SAVED_ITEM_ACTION_ORDER } from '../saved-item-menu/model.js';
import {
  MENU_ACTION_ICONS,
  resolveMenuActionIcon,
} from './menu-action-icons.js';

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
// Source files that build the labelled actions of an options menu. A new
// action added in one of them without a map entry fails the scan below.
const MENU_ACTION_SOURCES = [
  'library/components/saved-item-menu/saved-item-requests.ts',
  'library/components/saved-item-menu/saved-item-menus.ts',
  'library/components/saved-rehearsal-library-section/files-row-actions.ts',
  'library/components/saved-rehearsal-library-section/files-playable-row-actions.ts',
  'library/playback/utils/saved-track-row-actions.ts',
  'library/loops/utils/saved-loop-row-actions.ts',
  'library/drive/utils/drive-search-preview-actions.ts',
  'library/playlists/utils/saved-playlist-view-model.ts',
  'library/playlists/components/saved-playlist-detail-items-list/playlist-detail-row-controls-model.ts',
  'screens/recents/overflow-actions.ts',
  'screens/library/library-files-create-controls.tsx',
  'routing/queue/queue-surface-row.tsx',
];
// Labels declared next to menu actions that are not menu rows themselves
// (a toast's follow-up action).
const NON_MENU_LABELS = new Set(['View in folder']);
const ACTION_LABEL_PATTERN = /^\s+label: '([^']+)',$/gm;

const readActionLabels = (relativePath: string): string[] => {
  const source = readFileSync(resolve(APP_ROOT, relativePath), 'utf8');

  return [...source.matchAll(ACTION_LABEL_PATTERN)]
    .map((match) => match[1])
    .filter((label) => !NON_MENU_LABELS.has(label));
};

describe('menu action icons', () => {
  for (const relativePath of MENU_ACTION_SOURCES) {
    it(`gives every action label in ${relativePath} an icon`, () => {
      const labels = readActionLabels(relativePath);

      assert.ok(labels.length > 0, 'expected the source to declare actions');

      for (const label of labels) {
        assert.ok(MENU_ACTION_ICONS[label], `no icon for "${label}"`);
      }
    });
  }

  it('gives every bulk action and every ordered item action an icon', () => {
    const labels = [
      ...Object.values(BULK_ACTION_LABELS),
      ...Object.values(SAVED_ITEM_ACTION_ORDER).flat(),
    ];

    for (const label of labels) {
      assert.ok(MENU_ACTION_ICONS[label], `no icon for "${label}"`);
    }
  });

  it('maps only to icons the app icon set defines', () => {
    for (const [label, icon] of Object.entries(MENU_ACTION_ICONS)) {
      assert.ok(icon in APP_ICON_GLYPHS, `${label} maps to unknown ${icon}`);
    }
  });

  it('keeps taking an item out of a collection distinct from deleting data', () => {
    const trash = MENU_ACTION_ICONS['Remove from library'];

    assert.equal(MENU_ACTION_ICONS['Delete from folder'], trash);
    assert.notEqual(MENU_ACTION_ICONS['Remove from queue'], trash);
    assert.equal(
      MENU_ACTION_ICONS['Remove from queue'],
      MENU_ACTION_ICONS['Remove from playlist'],
    );
  });

  it('draws Play next and Add to queue with clearly different marks', () => {
    assert.notEqual(
      APP_ICON_GLYPHS[MENU_ACTION_ICONS['Play next']].glyph,
      APP_ICON_GLYPHS[MENU_ACTION_ICONS['Add to queue']].glyph,
    );
  });

  it('lets an explicit icon override the label default and leaves data labels bare', () => {
    assert.equal(
      resolveMenuActionIcon({ icon: 'plus', label: 'Rename' }),
      'plus',
    );
    assert.equal(resolveMenuActionIcon({ label: 'Rename' }), 'pencil-outline');
    assert.equal(resolveMenuActionIcon({ label: 'Verses 1–3' }), undefined);
  });
});
