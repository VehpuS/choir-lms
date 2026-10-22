import type {
  DriveUploadFailureReason,
  DriveUploadResult,
} from '@org/google-drive';

import type {
  DeviceFileCheck,
  DeviceFileRefusalReason,
} from './device-file-model';

/** `link` starts from a link the browser could not read; `device` from a file on hand. */
export type SaveFlowMode = 'device' | 'link';

export type AcceptedDeviceFile = Extract<
  DeviceFileCheck,
  { status: 'accepted' }
>;

export type SaveFolderTarget = { folderId: string; folderName: string };

/** What went wrong after the file was uploaded or while trying to. */
export type SaveFlowFailure = DriveUploadFailureReason | 'not-linked';

/** What the host did with a saved file: `linked`, or why not. */
export type SaveLinkOutcome = 'failed' | 'linked' | 'source-removed';

export type SaveFlowState = {
  failure?: SaveFlowFailure;
  file?: AcceptedDeviceFile;
  hasOpenedLink: boolean;
  mode: SaveFlowMode;
  /** Set when the chosen file was refused; the user picks another. */
  refusal?: DeviceFileRefusalReason;
  /** The track's link was removed while the file saved, so it was not swapped. */
  sourceRemoved?: boolean;
  step: 'failed' | 'file' | 'folder' | 'saved' | 'uploading';
  target?: SaveFolderTarget;
};

export type SaveFlowEvent =
  | { type: 'change-file' }
  | { type: 'change-folder' }
  | { check: DeviceFileCheck; type: 'file-checked' }
  | { target: SaveFolderTarget; type: 'folder-chosen' }
  | { type: 'link-opened' }
  | { outcome: SaveLinkOutcome; type: 'link-resolved' }
  | { type: 'retry' }
  | { result: DriveUploadResult; type: 'upload-finished' };

export const createSaveFlow = (mode: SaveFlowMode): SaveFlowState => ({
  hasOpenedLink: false,
  mode,
  step: 'file',
});

/**
 * The save flow's steps as a pure state machine, so every transition (a refused
 * file, a failed upload, a cancel, a source removed mid-upload) is testable
 * without a screen. A cancel or a failure keeps the chosen file, so only the
 * step that went wrong is repeated.
 */
export const reduceSaveFlow = (
  state: SaveFlowState,
  event: SaveFlowEvent,
): SaveFlowState => {
  switch (event.type) {
    case 'link-opened':
      return { ...state, hasOpenedLink: true };
    case 'file-checked':
      if (state.step !== 'file') {
        return state;
      }

      return event.check.status === 'accepted'
        ? {
            hasOpenedLink: state.hasOpenedLink,
            file: event.check,
            mode: state.mode,
            step: 'folder',
          }
        : { ...state, refusal: event.check.reason };
    case 'folder-chosen':
      return state.file && state.step === 'folder'
        ? { ...state, step: 'uploading', target: event.target }
        : state;
    case 'upload-finished':
      if (state.step !== 'uploading') {
        return state;
      }

      if (event.result.status === 'aborted') {
        return { ...state, step: 'folder' };
      }

      return event.result.status === 'failed'
        ? { ...state, failure: event.result.reason, step: 'failed' }
        : { ...state, step: 'saved' };
    case 'link-resolved':
      if (state.step !== 'saved' || event.outcome === 'linked') {
        return state;
      }

      return event.outcome === 'source-removed'
        ? { ...state, sourceRemoved: true }
        : { ...state, failure: 'not-linked', step: 'failed' };
    case 'retry':
      return state.step === 'failed' && state.file && state.target
        ? { ...state, failure: undefined, step: 'uploading' }
        : state;
    case 'change-folder':
      return state.file
        ? { ...state, failure: undefined, step: 'folder' }
        : state;
    case 'change-file':
      return {
        hasOpenedLink: state.hasOpenedLink,
        mode: state.mode,
        step: 'file',
      };
  }
};

export type SaveFailureAction =
  | 'allow-saving'
  | 'change-folder'
  | 'close'
  | 'retry';

export const describeSaveFailure = (
  failure: SaveFlowFailure,
): {
  action: SaveFailureAction;
  actionLabel: string;
  message: string;
  title: string;
} => {
  switch (failure) {
    case 'needs-write-access':
      return {
        action: 'allow-saving',
        actionLabel: 'Allow saving',
        message:
          'Google Drive did not accept the save because the app does not have permission to add files yet.',
        title: 'Saving to Drive was not allowed',
      };
    case 'quota':
      return {
        action: 'change-folder',
        actionLabel: 'Choose another folder',
        message:
          'This Drive has no room left, or Google is limiting requests. Free some space, or save to a Drive with room.',
        title: 'Drive could not take the file',
      };
    case 'folder-not-writable':
      return {
        action: 'change-folder',
        actionLabel: 'Choose another folder',
        message:
          'You can only view that folder, or it no longer exists. Pick a folder you can add files to.',
        title: 'Cannot save to that folder',
      };
    case 'offline':
      return {
        action: 'retry',
        actionLabel: 'Try again',
        message: 'Check your connection and try again. Nothing was changed.',
        title: 'No connection',
      };
    case 'too-large':
      return {
        action: 'close',
        actionLabel: 'Done',
        message: 'Files over 25 MB cannot be saved here.',
        title: 'This file is too large',
      };
    case 'not-linked':
      return {
        action: 'close',
        actionLabel: 'Done',
        message:
          "The file is in your Drive, but this track's list could not be updated. Add it with Add sheet music, From Google Drive.",
        title: 'Saved, but not added to the track',
      };
    case 'unavailable':
      return {
        action: 'retry',
        actionLabel: 'Try again',
        message: 'Something went wrong reaching Drive. Nothing was changed.',
        title: 'The file could not be saved',
      };
  }
};

export const SOURCE_REMOVED_MESSAGE =
  'The file is in your Drive, but its link was removed from the track while it saved, so the track was not changed.';
