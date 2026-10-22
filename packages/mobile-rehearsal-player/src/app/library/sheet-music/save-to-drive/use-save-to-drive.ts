import { uploadDriveFile, type DriveUploadResult } from '@org/google-drive';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { chooseDeviceFile } from './choose-device-file';
import type { DeviceFile, DeviceFileChoice } from './device-file-chooser-types';
import { checkDeviceFile, type DeviceFileCheck } from './device-file-model';
import {
  createSaveFlow,
  reduceSaveFlow,
  type SaveFlowMode,
  type SaveFolderTarget,
  type SaveLinkOutcome,
} from './save-flow-model';

/** What the flow calls outside itself; the spec swaps in fakes. */
export type SaveToDriveDependencies = {
  checkFile: (file: DeviceFile) => Promise<DeviceFileCheck>;
  chooseFile: () => Promise<DeviceFileChoice>;
  upload: typeof uploadDriveFile;
};

const defaultDependencies: SaveToDriveDependencies = {
  checkFile: (file) => checkDeviceFile(file),
  chooseFile: chooseDeviceFile,
  upload: uploadDriveFile,
};

export type SavedDriveFileResult = { fileId: string; name: string };

type UseSaveToDriveOptions = {
  accessToken: string | undefined;
  dependencies?: SaveToDriveDependencies;
  mode: SaveFlowMode;
  /**
   * Points the track at the saved file (or adds it) and says what happened. A
   * source removed while the upload ran is reported, not brought back.
   */
  onSaved: (file: SavedDriveFileResult) => Promise<SaveLinkOutcome>;
};

const MISSING_TOKEN_RESULT: DriveUploadResult = {
  reason: 'needs-write-access',
  status: 'failed',
};

/**
 * Runs the Save to Drive steps: choose a file and check it, choose a folder,
 * upload with a cancel, then hand the saved file to the caller. The upload is
 * aborted if the sheet closes, and a late answer after that is ignored.
 */
export const useSaveToDrive = ({
  accessToken,
  dependencies = defaultDependencies,
  mode,
  onSaved,
}: UseSaveToDriveOptions) => {
  const [state, dispatch] = useReducer(reduceSaveFlow, mode, createSaveFlow);
  const controllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  // Read at the moment an upload finishes, so a late change of caller is used.
  const onSavedRef = useRef(onSaved);

  onSavedRef.current = onSaved;

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const upload = useCallback(
    async (target: SaveFolderTarget) => {
      const file = state.file;

      if (!file) {
        return;
      }

      const controller = new AbortController();

      controllerRef.current = controller;

      const result = accessToken
        ? await dependencies.upload({
            accessToken,
            bytes: file.bytes,
            folderId: target.folderId,
            mimeType: file.mimeType,
            name: file.name,
            signal: controller.signal,
          })
        : MISSING_TOKEN_RESULT;

      controllerRef.current = null;

      if (!isMountedRef.current) {
        return;
      }

      dispatch({ result, type: 'upload-finished' });

      if (result.status === 'uploaded') {
        const outcome = await onSavedRef.current({
          fileId: result.file.id,
          name: result.file.name,
        });

        if (isMountedRef.current) {
          dispatch({ outcome, type: 'link-resolved' });
        }
      }
    },
    [accessToken, dependencies, state.file],
  );

  const chooseFile = useCallback(async () => {
    const choice = await dependencies.chooseFile();

    if (!isMountedRef.current || choice.status === 'cancelled') {
      return;
    }

    dispatch({
      check:
        choice.status === 'chosen'
          ? await dependencies.checkFile(choice.file)
          : { reason: 'unsupported-type', status: 'refused' },
      type: 'file-checked',
    });
  }, [dependencies]);

  return {
    cancelUpload: () => controllerRef.current?.abort(),
    changeFile: () => dispatch({ type: 'change-file' }),
    changeFolder: () => dispatch({ type: 'change-folder' }),
    chooseFile,
    chooseFolder: (target: SaveFolderTarget) => {
      dispatch({ target, type: 'folder-chosen' });
      void upload(target);
    },
    markLinkOpened: () => dispatch({ type: 'link-opened' }),
    retry: () => {
      if (state.target) {
        dispatch({ type: 'retry' });
        void upload(state.target);
      }
    },
    state,
  };
};
