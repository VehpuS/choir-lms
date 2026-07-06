import type { PlaylistDraftIssue } from '../../../library/playlists/utils/saved-playlist-view-model';
import type { UpNextSurfaceSummary } from '../shell-model';

export type QueuePlaylistUpdateAction = NonNullable<
  NonNullable<UpNextSurfaceSummary['queuePlaylistActions']>['updateAction']
>;

export type QueuePlaylistDialogState = {
  isSaveDialogVisible: boolean;
  isUpdateDialogVisible: boolean;
  issue: PlaylistDraftIssue | null;
  queuePlaylistDraftName: string;
  updateAction: QueuePlaylistUpdateAction | null;
};

export const createQueuePlaylistDialogState = (): QueuePlaylistDialogState => {
  return {
    isSaveDialogVisible: false,
    isUpdateDialogVisible: false,
    issue: null,
    queuePlaylistDraftName: '',
    updateAction: null,
  };
};

export const closeQueuePlaylistSaveDialog = (
  state: QueuePlaylistDialogState,
): QueuePlaylistDialogState => {
  return {
    ...state,
    isSaveDialogVisible: false,
    issue: null,
  };
};

export const closeQueuePlaylistUpdateDialog = (
  state: QueuePlaylistDialogState,
): QueuePlaylistDialogState => {
  return {
    ...state,
    isUpdateDialogVisible: false,
    issue: null,
    updateAction: null,
  };
};

export const openQueuePlaylistSaveDialog = (
  state: QueuePlaylistDialogState,
): QueuePlaylistDialogState => {
  return {
    ...state,
    isSaveDialogVisible: true,
    isUpdateDialogVisible: false,
    issue: null,
    updateAction: null,
  };
};

export const openQueuePlaylistUpdateDialog = (
  state: QueuePlaylistDialogState,
  updateAction: QueuePlaylistUpdateAction,
): QueuePlaylistDialogState => {
  return {
    ...state,
    isSaveDialogVisible: false,
    isUpdateDialogVisible: true,
    issue: null,
    updateAction,
  };
};

export const setQueuePlaylistDialogIssue = (
  state: QueuePlaylistDialogState,
  issue: PlaylistDraftIssue | null,
): QueuePlaylistDialogState => {
  return {
    ...state,
    issue,
  };
};

export const setQueuePlaylistDraftName = (
  state: QueuePlaylistDialogState,
  value: string,
): QueuePlaylistDialogState => {
  return {
    ...state,
    issue: null,
    queuePlaylistDraftName: value,
  };
};
