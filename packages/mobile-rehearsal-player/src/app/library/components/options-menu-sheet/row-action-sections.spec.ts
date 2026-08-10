import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  attachRowActionSections,
  getRowActionSection,
} from './row-action-sections.js';

describe('row action sections', () => {
  it('groups the shared rehearsal/organize/destructive vocabulary shared by Files, Tracks, and Loops menus', () => {
    assert.equal(getRowActionSection('Play next'), 'rehearsal');
    assert.equal(getRowActionSection('Add to queue'), 'rehearsal');
    assert.equal(getRowActionSection('Add to playlist'), 'rehearsal');
    assert.equal(getRowActionSection('Playlists unavailable'), 'rehearsal');
    assert.equal(getRowActionSection('Updating playlist…'), 'rehearsal');
    assert.equal(getRowActionSection('View track loops'), 'rehearsal');
    assert.equal(getRowActionSection('Make loop'), 'rehearsal');
    assert.equal(getRowActionSection('Preparing loop…'), 'rehearsal');
    assert.equal(getRowActionSection('Edit loop'), 'rehearsal');
    assert.equal(getRowActionSection('Editing…'), 'rehearsal');

    assert.equal(getRowActionSection('Reconnect'), 'organize');
    assert.equal(getRowActionSection('Create a copy'), 'organize');
    assert.equal(getRowActionSection('Edit tags'), 'organize');
    assert.equal(getRowActionSection('Rename'), 'organize');
    assert.equal(getRowActionSection('Move to folder'), 'organize');

    assert.equal(getRowActionSection('Delete from folder'), 'destructive');
    assert.equal(getRowActionSection('Remove from library'), 'destructive');
    assert.equal(getRowActionSection('Remove'), 'destructive');
    assert.equal(getRowActionSection('Removing…'), 'destructive');
  });

  it('leaves unlisted labels unsectioned so unrelated menus stay flat', () => {
    assert.equal(getRowActionSection('Rename playlist'), undefined);
    assert.equal(getRowActionSection('Share'), undefined);
  });

  it('attaches the resolved section to each action without changing order or other fields', () => {
    const actions = attachRowActionSections([
      { id: 'a', label: 'Play next', onPress: () => undefined },
      { id: 'b', label: 'Remove', onPress: () => undefined, tone: 'destructive' as const },
      { id: 'c', label: 'Custom action', onPress: () => undefined },
    ]);

    assert.deepEqual(
      actions.map((action) => ({ id: action.id, section: action.section })),
      [
        { id: 'a', section: 'rehearsal' },
        { id: 'b', section: 'destructive' },
        { id: 'c', section: undefined },
      ],
    );
  });
});
