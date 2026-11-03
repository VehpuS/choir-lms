import { ensureDriveFolder } from '@org/google-drive';
import { useEffect, useRef, useState } from 'react';

import type { useGoogleDriveAuthorization } from '../../../auth/google-drive/hooks/use-authorization';
import { DriveFolderPickerSheet } from '../../sheet-music/drive-picker/drive-folder-picker-sheet';
import {
  createFolderPickerNavigation,
  toSaveFolder,
  type DriveSaveFolder,
} from '../../sheet-music/drive-picker/folder-mode-model';
import {
  rememberSaveFolder,
  restoreSaveFolder,
} from '../../sheet-music/drive-picker/save-folder-storage';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  attachAutoExportRetry,
  publishAutoExportFolderState,
  publishAutoExportStatus,
} from '../export/auto-export-controller';
import { createAutoExportQueue } from '../export/auto-export-queue';
import { DEFAULT_EXPORT_FOLDER_NAME } from '../export/auto-export-settings';
import {
  autoExportSettingsStore,
  useAutoExportSettings,
} from '../export/auto-export-settings-store';
import { appConnectivity } from '../export/connectivity';
import { createRecordingExportDependencies } from '../export/create-export-dependencies';
import {
  publishDriveSession,
  registerDriveWriteAccessRequest,
  registerExportFolderChoice,
} from '../export/drive-session-bridge';
import { EXPORT_FOLDER_KEY } from '../export/use-recording-export';
import type { ExportRunnerDependencies } from '../export/recording-export-runner';
import { recordingsStorageSupported } from '../recording-capabilities';
import {
  getRecordingsStore,
  subscribeToRecordingsChange,
} from '../recordings-store-instance';

type Authorization = Pick<
  ReturnType<typeof useGoogleDriveAuthorization>,
  'authState' | 'hasWriteAccess' | 'isBusy' | 'startAuthorization'
>;

type RecordingAutoExportHostProps = {
  authorization: Authorization;
  library: { savedLibrarySources: readonly DriveLibrarySource[] };
};

type Queue = ReturnType<typeof createAutoExportQueue>;

/**
 * Owns the background export queue (rehearsal-recording design Decision 19) and
 * keeps it going: it looks for due exports at start-up, when a recording is
 * saved, when the settings change, when the Drive session arrives, and when the
 * connection changes. It also creates the default folder once the permission is
 * there, and publishes the session and the queue's state for Settings and the
 * rows. Its only
 * screen is the folder picker `Change` opens.
 */
export const RecordingAutoExportHost = ({
  authorization,
  library,
}: RecordingAutoExportHostProps) => {
  const latest = useRef({ authorization, library });
  const queueRef = useRef<Queue | null>(null);
  const isEnsuringFolder = useRef(false);
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [rememberedFolder, setRememberedFolder] = useState<DriveSaveFolder>();
  const settings = useAutoExportSettings();
  const { accessToken } = authorization.authState;
  const { hasWriteAccess, isBusy, startAuthorization } = authorization;

  latest.current = { authorization, library };

  useEffect(() => {
    if (!recordingsStorageSupported()) {
      return undefined;
    }

    // The session changes under the queue, so each call reads the latest one.
    const current = (): ExportRunnerDependencies =>
      createRecordingExportDependencies({
        accessToken: latest.current.authorization.authState.accessToken,
        sources: latest.current.library.savedLibrarySources,
      });
    const queue = createAutoExportQueue({
      connectivity: appConnectivity,
      dependencies: {
        decodeTrack: (audio) => current().decodeTrack(audio),
        makeBlob: (parts, type) => current().makeBlob(parts, type),
        readRecording: (id) => current().readRecording(id),
        resolveOriginal: (recording) => current().resolveOriginal(recording),
        saveToDevice: (name, blob) => current().saveToDevice(name, blob),
        upload: (options) => current().upload(options),
      },
      getSession: () => ({
        accessToken: latest.current.authorization.authState.accessToken,
        hasWriteAccess: latest.current.authorization.hasWriteAccess,
      }),
      getSettings: autoExportSettingsStore.get,
      store: getRecordingsStore(),
    });

    queueRef.current = queue;

    const stops = [
      queue.subscribe(() => publishAutoExportStatus(queue.getStatus())),
      autoExportSettingsStore.subscribe(() => void queue.kick()),
      subscribeToRecordingsChange((change) => {
        if (change === 'complete') {
          void queue.kick();
        }
      }),
      attachAutoExportRetry((id) => queue.retry(id)),
    ];

    void queue.kick();

    return () => {
      stops.forEach((stop) => stop());
      queue.dispose();
      queueRef.current = null;
    };
  }, []);

  // The session arriving (or the permission being granted) is a chance to upload.
  useEffect(() => {
    void queueRef.current?.kick();
  }, [accessToken, hasWriteAccess, settings]);

  useEffect(() => {
    publishDriveSession({ hasWriteAccess, isBusy });
  }, [hasWriteAccess, isBusy]);

  useEffect(
    () => registerDriveWriteAccessRequest(startAuthorization),
    [startAuthorization],
  );

  // Turning the setting on picks `Choir Recordings`; it is found or created once there is permission.
  useEffect(() => {
    if (
      !settings.enabled ||
      settings.folder ||
      !accessToken ||
      !hasWriteAccess ||
      isEnsuringFolder.current
    ) {
      return;
    }

    isEnsuringFolder.current = true;
    publishAutoExportFolderState({ state: 'creating' });

    void ensureDriveFolder({
      accessToken,
      name: DEFAULT_EXPORT_FOLDER_NAME,
    }).then(async (result) => {
      isEnsuringFolder.current = false;

      if (result.status === 'ready') {
        publishAutoExportFolderState({ state: 'idle' });
        await autoExportSettingsStore.change({
          folder: {
            folderId: result.folder.id,
            folderName: result.folder.name,
          },
          type: 'set-folder',
        });
      } else if (result.status === 'failed') {
        publishAutoExportFolderState({
          reason: result.reason,
          state: 'failed',
        });
      }
    });
  }, [accessToken, hasWriteAccess, settings.enabled, settings.folder]);

  // `Change` in Settings opens the folder picker here, where the Drive token is.
  useEffect(
    () =>
      registerExportFolderChoice(() => {
        void restoreSaveFolder(undefined, EXPORT_FOLDER_KEY).then((folder) => {
          setRememberedFolder(folder);
          setIsPickingFolder(true);
        });
      }),
    [],
  );

  if (!isPickingFolder) {
    return null;
  }

  return (
    <DriveFolderPickerSheet
      accessToken={accessToken}
      initialNavigation={createFolderPickerNavigation({
        remembered: rememberedFolder,
      })}
      onChoose={({ navigation, folderId, folderName }) => {
        void rememberSaveFolder(
          toSaveFolder(navigation),
          undefined,
          EXPORT_FOLDER_KEY,
        );
        void autoExportSettingsStore.change({
          folder: { folderId, folderName },
          type: 'set-folder',
        });
        setIsPickingFolder(false);
      }}
      onClose={() => setIsPickingFolder(false)}
      onReconnectDrive={startAuthorization}
    />
  );
};
