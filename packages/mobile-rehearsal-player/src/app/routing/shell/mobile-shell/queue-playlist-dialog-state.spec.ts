/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PlaylistDraftIssue } from '../../../library/playlists/utils/saved-playlist-view-model.js';
import {
  closeQueuePlaylistUpdateDialog,
  createQueuePlaylistDialogState,
  openQueuePlaylistSaveDialog,
  openQueuePlaylistUpdateDialog,
  setQueuePlaylistDialogIssue,
  setQueuePlaylistDraftName,
  type QueuePlaylistUpdateAction,
} from './queue-playlist-dialog-state.js';

const UPDATE_ACTION: QueuePlaylistUpdateAction = {
  confirmLabel: 'Update playlist',
  confirmationMessage:
    'Replace the saved items and order in Wednesday rehearsal with the current Up Next order.',
  confirmationTitle: 'Update Wednesday rehearsal?',
  label: 'Update current playlist',
};

const ISSUE: PlaylistDraftIssue = {
  message: 'Try again after reconnecting to Drive.',
  title: 'Unable to update playlist',
};

describe('queue playlist dialog state', () => {
  it('opens the update dialog with confirmation copy and clears prior save state', () => {
    const draftState = setQueuePlaylistDraftName(
      openQueuePlaylistSaveDialog(createQueuePlaylistDialogState()),
      'Wednesday rehearsal',
    );

    const nextState = openQueuePlaylistUpdateDialog(draftState, UPDATE_ACTION);

    assert.deepEqual(nextState, {
      isSaveDialogVisible: false,
      isUpdateDialogVisible: true,
      issue: null,
      queuePlaylistDraftName: 'Wednesday rehearsal',
      updateAction: UPDATE_ACTION,
    });
  });

  it('closes the update dialog and clears issue state', () => {
    const nextState = closeQueuePlaylistUpdateDialog(
      setQueuePlaylistDialogIssue(
        openQueuePlaylistUpdateDialog(
          createQueuePlaylistDialogState(),
          UPDATE_ACTION,
        ),
        ISSUE,
      ),
    );

    assert.deepEqual(nextState, {
      isSaveDialogVisible: false,
      isUpdateDialogVisible: false,
      issue: null,
      queuePlaylistDraftName: '',
      updateAction: null,
    });
  });
});
