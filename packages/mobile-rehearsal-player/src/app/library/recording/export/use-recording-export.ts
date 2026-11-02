import type { Recording } from '@org/audio-library-models';
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
  defaultExportFileName,
  describeMixAvailability,
  normalizeExportFileName,
  reduceExportRun,
  type ExportDestination,
  type ExportKind,
  type ExportRun,
  type ExportRunEvent,
  type MixAvailability,
} from './recording-export-model';
import {
  runRecordingExports,
  type ExportPlan,
  type ExportRunnerDependencies,
} from './recording-export-runner';

export const EXPORT_FOLDER_KEY = 'choirlms.recording-export.folder';

export type ExportFolder = { folderId: string; folderName: string };

type UseRecordingExportOptions = {
  accessToken: string | undefined;
  /** The dependencies for the running app; specs pass fakes. */
  dependencies: ExportRunnerDependencies;
  hasWriteAccess: boolean;
  recordings: readonly Recording[];
};

/** Mix availability per recording: absent while it is still being checked. */
export type MixAvailabilityMap = Readonly<Record<string, MixAvailability>>;

/**
 * Holds the export dialog's choices and runs the exports. The choices live
 * here, not in the sheet, so a closed picker or a permission round trip
 * returns to the same dialog.
 */
export const useRecordingExport = ({
  accessToken,
  dependencies,
  hasWriteAccess,
  recordings,
}: UseRecordingExportOptions) => {
  const [kind, setKind] = useState<ExportKind>('recording');
  const [destination, setDestination] = useState<ExportDestination>('drive');
  const [balance, setBalance] = useState(recordings[0]?.balance ?? 50);
  const [typedName, setTypedName] = useState<string | null>(null);
  const [folder, setFolder] = useState<ExportFolder>();
  const [remembered, setRemembered] = useState<DriveSaveFolder>();
  const [availability, setAvailability] = useState<MixAvailabilityMap>({});
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

    void restoreSaveFolder(undefined, EXPORT_FOLDER_KEY).then((stored) => {
      if (isCurrent) {
        setRemembered(stored);

        // Start on the folder used last, so a repeat export is one tap; nothing
        // is written until the user confirms.
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

  // A mix needs the original, so check where it comes from before offering it.
  useEffect(() => {
    if (kind !== 'mix') {
      return;
    }

    let isCurrent = true;

    void Promise.all(
      recordings.map(async (recording) => {
        const resolution = await dependencies.resolveOriginal(recording);

        return [recording.id, describeMixAvailability(resolution)] as const;
      }),
    ).then((entries) => {
      if (isCurrent) {
        setAvailability(Object.fromEntries(entries));
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [dependencies, kind, recordings]);

  const isSingle = recordings.length === 1;
  const checked = recordings.every((recording) => availability[recording.id]);
  const states = recordings.map((recording) => availability[recording.id]);
  const changedCount = states.filter(
    (state) => state?.state === 'changed',
  ).length;
  const unavailableCount = states.filter(
    (state) => state?.state === 'unavailable',
  ).length;

  const fileNameFor = useCallback(
    (recording: Recording): string => {
      const fallback = defaultExportFileName(recording, kind);

      return isSingle && typedName !== null
        ? normalizeExportFileName(typedName, fallback)
        : fallback;
    },
    [isSingle, kind, typedName],
  );

  const dispatch = useCallback((event: ExportRunEvent) => {
    if (isMountedRef.current) {
      setRun((current) =>
        current ? reduceExportRun(current, event) : current,
      );
    }
  }, []);

  const execute = useCallback(
    async (items: ExportPlan['items']) => {
      const controller = new AbortController();

      controllerRef.current = controller;

      await runRecordingExports(
        { accessToken, balance, destination, folder, items, kind },
        dependencies,
        { dispatch, signal: controller.signal },
      );
      controllerRef.current = null;
    },
    [accessToken, balance, destination, dependencies, dispatch, folder, kind],
  );

  const start = useCallback(async () => {
    const items = recordings.map((recording) => ({
      fileName: fileNameFor(recording),
      recording,
    }));

    setRun(
      createExportRun(
        items.map((item) => ({
          fileName: item.fileName,
          recordingId: item.recording.id,
        })),
      ),
    );

    if (destination === 'drive' && chosenNavigation.current) {
      void rememberSaveFolder(
        toSaveFolder(chosenNavigation.current),
        undefined,
        EXPORT_FOLDER_KEY,
      );
    }

    await execute(items);
  }, [destination, execute, fileNameFor, recordings]);

  const retry = useCallback(async () => {
    if (!run) {
      return;
    }

    const failed = new Set(
      run.items
        .filter((item) => item.status === 'failed')
        .map((item) => item.recordingId),
    );

    setRun(reduceExportRun(run, { type: 'retry' }));
    await execute(
      recordings
        .filter((recording) => failed.has(recording.id))
        .map((recording) => ({
          fileName: fileNameFor(recording),
          recording,
          resumeUri: run.items.find((item) => item.recordingId === recording.id)
            ?.resumeUri,
        })),
    );
  }, [execute, fileNameFor, recordings, run]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const chooseFolder = useCallback(
    (target: ExportFolder & { navigation: DrivePickerNavigation }) => {
      chosenNavigation.current = target.navigation;
      setFolder({ folderId: target.folderId, folderName: target.folderName });
    },
    [],
  );

  return {
    availability,
    balance,
    cancel,
    changedCount,
    checked,
    chooseFolder,
    defaultName: recordings[0]
      ? defaultExportFileName(recordings[0], kind)
      : '',
    destination,
    folder,
    folderPickerStart: createFolderPickerNavigation({ remembered }),
    isSingle,
    kind,
    nameValue:
      typedName ??
      (recordings[0] ? defaultExportFileName(recordings[0], kind) : ''),
    retry,
    run,
    setBalance,
    setDestination,
    setKind,
    setTypedName,
    start,
    unavailableCount,
    canWrite: hasWriteAccess,
  };
};
