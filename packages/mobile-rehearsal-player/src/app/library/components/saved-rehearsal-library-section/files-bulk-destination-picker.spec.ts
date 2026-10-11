import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildBulkDestinationPicker } from './files-bulk-destination-picker';

const folder = (id: string, parentFolderId: string | null) => ({
  folder: {
    createdAt: '2026-01-01T00:00:00.000Z',
    id,
    name: id,
    parentFolderId,
  },
});
const destinationFolders = [
  folder('root', null),
  folder('verses', 'root'),
  folder('alto', 'verses'),
  folder('other', 'root'),
];
const base = {
  currentFilesFolderId: 'root',
  destinationFolders,
  isMutating: false,
  onOpenFolder: () => undefined,
  onSelectFolder: () => undefined,
};

describe('buildBulkDestinationPicker', () => {
  it('offers the current folder, its subfolders, and a way back', () => {
    const picker = buildBulkDestinationPicker({
      ...base,
      mode: 'copy',
      pickerFolderId: 'verses',
      selectedFolderIds: new Set(),
    });

    assert.equal(picker.title, 'Copy to verses');
    assert.deepEqual(
      picker.actions.map(({ label }) => label),
      ['Copy here', 'Back to root', 'alto'],
    );
  });

  it('marks the folder being browsed when it is the Files folder', () => {
    const picker = buildBulkDestinationPicker({
      ...base,
      mode: 'move',
      pickerFolderId: 'root',
      selectedFolderIds: new Set(),
    });

    assert.equal(picker.actions[0].label, 'Move here (current folder)');
  });

  it('blocks moving a selected folder into itself or its subfolders', () => {
    const picker = buildBulkDestinationPicker({
      ...base,
      mode: 'move',
      pickerFolderId: 'verses',
      selectedFolderIds: new Set(['verses']),
    });

    assert.equal(picker.actions[0].disabled, true);
    assert.equal(
      picker.actions.find(({ label }) => label === 'alto')?.disabled,
      true,
    );
    assert.equal(
      picker.actions.find(({ label }) => label === 'Back to root')?.disabled,
      false,
    );
  });

  it('does not block a copy by the folder rule, since folders cannot be copied anyway', () => {
    const picker = buildBulkDestinationPicker({
      ...base,
      mode: 'copy',
      pickerFolderId: 'verses',
      selectedFolderIds: new Set(['verses']),
    });

    assert.equal(picker.actions[0].disabled, false);
  });
});
