import type { Recording } from '@org/audio-library-models';
import { useEffect, useMemo, useState } from 'react';

import type { useGoogleDriveAuthorization } from '../../../auth/google-drive/hooks/use-authorization';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { DriveFolderPickerSheet } from '../../sheet-music/drive-picker/drive-folder-picker-sheet';
import { createRecordingExportDependencies } from '../export/create-export-dependencies';
import { subscribeToRecordingExport } from '../export/recording-export-request';
import { useRecordingExport } from '../export/use-recording-export';
import { setRecordingMixBalanceFor } from '../overlay/recording-mix-store';
import { requestRecordingPreview } from '../overlay/recording-preview-request';
import { getRecordingsStore } from '../recordings-store-instance';
import { RecordingExportSheet } from './recording-export-sheet';

type Authorization = Pick<
  ReturnType<typeof useGoogleDriveAuthorization>,
  'authState' | 'hasWriteAccess' | 'isBusy' | 'startAuthorization'
>;

type RecordingExportHostProps = {
  authorization: Authorization;
  library: { savedLibrarySources: readonly DriveLibrarySource[] };
};

type DialogProps = RecordingExportHostProps & {
  recordings: readonly Recording[];
  onClose: () => void;
};

const ExportDialog = ({
  authorization,
  library,
  onClose,
  recordings,
}: DialogProps) => {
  const accessToken = authorization.authState.accessToken;
  const sources = library.savedLibrarySources;
  const dependencies = useMemo(
    () => createRecordingExportDependencies({ accessToken, sources }),
    [accessToken, sources],
  );
  const state = useRecordingExport({
    accessToken,
    dependencies,
    hasWriteAccess: authorization.hasWriteAccess,
    recordings,
  });
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [hasAskedForPermission, setHasAskedForPermission] = useState(false);
  const [first] = recordings;

  if (isPickingFolder) {
    return (
      <DriveFolderPickerSheet
        accessToken={accessToken}
        initialNavigation={state.folderPickerStart}
        onChoose={(target) => {
          state.chooseFolder(target);
          setIsPickingFolder(false);
        }}
        onClose={() => setIsPickingFolder(false)}
        onReconnectDrive={authorization.startAuthorization}
      />
    );
  }

  return (
    <RecordingExportSheet
      hasAskedForPermission={hasAskedForPermission}
      isAuthorizing={authorization.isBusy}
      onAllowSaving={() => {
        setHasAskedForPermission(true);
        authorization.startAuthorization();
      }}
      onChooseFolder={() => setIsPickingFolder(true)}
      onClose={onClose}
      onKeepBalance={(balance) => {
        if (first) {
          void getRecordingsStore().update(first.id, { balance });
        }
      }}
      onPreview={(balance) =>
        first &&
        requestRecordingPreview({
          balance,
          kind: 'play',
          recordingId: first.id,
        })
      }
      onPreviewBalanceChange={(balance) =>
        first && setRecordingMixBalanceFor(first.id, balance)
      }
      onStopPreview={() =>
        first &&
        requestRecordingPreview({ kind: 'stop', recordingId: first.id })
      }
      recordings={recordings}
      state={state}
    />
  );
};

/**
 * Opens the export dialog when any recording menu, the save sheet, or the
 * bulk bar asks for it over the export request channel. It lives at the router
 * because it holds the Drive session.
 */
export const RecordingExportHost = ({
  authorization,
  library,
}: RecordingExportHostProps) => {
  const [recordings, setRecordings] = useState<readonly Recording[] | null>(
    null,
  );

  useEffect(() => {
    return subscribeToRecordingExport(({ recordingIds }) => {
      void Promise.all(
        recordingIds.map((id) => getRecordingsStore().get(id)),
      ).then((found) => {
        const existing = found.filter(
          (recording): recording is Recording => recording !== null,
        );

        setRecordings(existing.length > 0 ? existing : null);
      });
    });
  }, []);

  return recordings ? (
    <ExportDialog
      authorization={authorization}
      library={library}
      onClose={() => setRecordings(null)}
      recordings={recordings}
    />
  ) : null;
};
