import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createFolderPickerNavigation,
  toSaveFolder,
  type DriveSaveFolder,
} from '../../sheet-music/drive-picker/folder-mode-model';
import type { DrivePickerNavigation } from '../../sheet-music/drive-picker/model';
import {
  rememberSaveFolder,
  restoreSaveFolder,
} from '../../sheet-music/drive-picker/save-folder-storage';
import {
  createExportRun,
  normalizeExportFileName,
  reduceExportRun,
  type ExportDestination,
  type ExportRun,
  type ExportRunEvent,
} from '../../recording/export/recording-export-model';
import { EXPORT_FOLDER_KEY } from '../../recording/export/use-recording-export';
import type { CompositeExportModel } from './composite-export-model';
import {
  runCompositeExport,
  type CompositeExportDependencies,
} from './composite-export-runner';
import type { CompositeRenderShaping } from '@org/audio-mixing';

type ExportFolder = { folderId: string; folderName: string };

type UseCompositeExportOptions = {
  accessToken: string | undefined;
  compositeId: string;
  /** Null where composites cannot run: the export cannot start. */
  dependencies: CompositeExportDependencies | null;
  hasWriteAccess: boolean;
  model: CompositeExportModel;
  /** The speed and pitch when the dialog opened; fixed for this export. */
  shaping: CompositeRenderShaping;
};

/**
 * Holds the composite export dialog's choices and runs the export, like
 * `useRecordingExport`: the choices live here so a closed folder picker or a
 * permission round trip returns to the same dialog. The mix and shaping are
 * read once when the dialog opens, so exporting touches no live state.
 */
export const useCompositeExport = ({
  accessToken,
  compositeId,
  dependencies,
  hasWriteAccess,
  model,
  shaping,
}: UseCompositeExportOptions) => {
  const [destination, setDestination] = useState<ExportDestination>('drive');
  const [typedName, setTypedName] = useState<string | null>(null);
  const [folder, setFolder] = useState<ExportFolder>();
  const [remembered, setRemembered] = useState<DriveSaveFolder>();
  const [run, setRun] = useState<ExportRun | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const chosenNavigation = useRef<DrivePickerNavigation | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    // The folder last used for any export, so a repeat export is one tap.
    void restoreSaveFolder(undefined, EXPORT_FOLDER_KEY).then((stored) => {
      if (isCurrent) {
        setRemembered(stored);

        const last = stored?.path.at(-1);

        if (last) {
          setFolder(
            (current) =>
              current ?? { folderId: last.id, folderName: last.name },
          );
        }
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  const fileName =
    typedName === null
      ? model.defaultFileName
      : normalizeExportFileName(typedName, model.defaultFileName);
  const dispatch = useCallback((event: ExportRunEvent) => {
    if (isMountedRef.current) {
      setRun((current) =>
        current ? reduceExportRun(current, event) : current,
      );
    }
  }, []);

  const execute = useCallback(
    async (resumeUri?: string) => {
      if (!dependencies) {
        return;
      }

      const controller = new AbortController();

      controllerRef.current = controller;
      await runCompositeExport(
        {
          accessToken,
          destination,
          exportId: compositeId,
          fileName,
          folder,
          resumeUri,
          shaping,
          stems: model.stems,
        },
        dependencies,
        { dispatch, signal: controller.signal },
      );
      controllerRef.current = null;
    },
    [
      accessToken,
      compositeId,
      dependencies,
      destination,
      dispatch,
      fileName,
      folder,
      model.stems,
      shaping,
    ],
  );

  const start = useCallback(async () => {
    setRun(createExportRun([{ fileName, recordingId: compositeId }]));

    if (destination === 'drive' && chosenNavigation.current) {
      void rememberSaveFolder(
        toSaveFolder(chosenNavigation.current),
        undefined,
        EXPORT_FOLDER_KEY,
      );
    }

    await execute();
  }, [compositeId, destination, execute, fileName]);

  const retry = useCallback(async () => {
    if (!run) {
      return;
    }

    const resumeUri = run.items[0]?.resumeUri;

    setRun(reduceExportRun(run, { type: 'retry' }));
    await execute(resumeUri);
  }, [execute, run]);

  const chooseFolder = useCallback(
    (target: ExportFolder & { navigation: DrivePickerNavigation }) => {
      chosenNavigation.current = target.navigation;
      setFolder({ folderId: target.folderId, folderName: target.folderName });
    },
    [],
  );

  return {
    canWrite: hasWriteAccess,
    cancel: useCallback(() => controllerRef.current?.abort(), []),
    chooseFolder,
    destination,
    folder,
    folderPickerStart: createFolderPickerNavigation({ remembered }),
    nameValue: typedName ?? model.defaultFileName,
    retry,
    run,
    setDestination,
    setTypedName,
    start,
  };
};
