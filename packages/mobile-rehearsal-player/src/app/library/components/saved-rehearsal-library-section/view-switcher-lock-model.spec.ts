import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveIsViewSwitcherLocked } from './view-switcher-lock-model';

const ALL_CLOSED = {
  isDetailViewOpen: false,
  isFilesPlaylistRenameOpen: false,
  isLoopBuilderOpen: false,
  isPlaylistCardRenameOpen: false,
  isPlaylistCreateDialogOpen: false,
  isPlaylistDetailRenameOpen: false,
  isTagEditorOpen: false,
};

describe('resolveIsViewSwitcherLocked', () => {
  it('stays unlocked when no edit surface is open', () => {
    assert.equal(resolveIsViewSwitcherLocked(ALL_CLOSED), false);
  });

  it('locks while the loop builder is open', () => {
    assert.equal(
      resolveIsViewSwitcherLocked({
        ...ALL_CLOSED,
        isLoopBuilderOpen: true,
      }),
      true,
    );
  });

  it('locks while a playlist quick-access card rename is open', () => {
    assert.equal(
      resolveIsViewSwitcherLocked({
        ...ALL_CLOSED,
        isPlaylistCardRenameOpen: true,
      }),
      true,
    );
  });

  it('locks while a playlist create dialog is open', () => {
    assert.equal(
      resolveIsViewSwitcherLocked({
        ...ALL_CLOSED,
        isPlaylistCreateDialogOpen: true,
      }),
      true,
    );
  });

  it('locks while the playlist-detail rename dialog is open', () => {
    assert.equal(
      resolveIsViewSwitcherLocked({
        ...ALL_CLOSED,
        isPlaylistDetailRenameOpen: true,
      }),
      true,
    );
  });

  it('locks while the tag editor is open', () => {
    assert.equal(
      resolveIsViewSwitcherLocked({
        ...ALL_CLOSED,
        isTagEditorOpen: true,
      }),
      true,
    );
  });

  it('locks while a Files-tree playlist rename is open', () => {
    assert.equal(
      resolveIsViewSwitcherLocked({
        ...ALL_CLOSED,
        isFilesPlaylistRenameOpen: true,
      }),
      true,
    );
  });

  it('locks while a full-screen detail view (playlist detail or track-loop detail) is open, since switching views has no effect there', () => {
    assert.equal(
      resolveIsViewSwitcherLocked({
        ...ALL_CLOSED,
        isDetailViewOpen: true,
      }),
      true,
    );
  });
});
