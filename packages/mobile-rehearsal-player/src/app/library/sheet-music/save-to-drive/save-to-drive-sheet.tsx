import type { SheetMusicSource } from '@org/audio-library-models';
import { useEffect, useRef, useState } from 'react';

import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import { DriveFolderPickerSheet } from '../drive-picker/drive-folder-picker-sheet';
import {
  createFolderPickerNavigation,
  toSaveFolder,
  type DriveSaveFolder,
} from '../drive-picker/folder-mode-model';
import type { DrivePickerNavigation } from '../drive-picker/model';
import {
  rememberSaveFolder,
  restoreSaveFolder,
} from '../drive-picker/save-folder-storage';
import { resolveExternalUrl } from '../viewer/model';
import { SaveFlowPanel } from './save-flow-panel';
import type { SaveLinkOutcome } from './save-flow-model';
import {
  useSaveToDrive,
  type SaveToDriveDependencies,
  type SavedDriveFileResult,
} from './use-save-to-drive';

type SaveToDriveSheetProps = {
  accessToken: string | undefined;
  dependencies?: SaveToDriveDependencies;
  hasWriteAccess: boolean;
  isAuthorizing: boolean;
  onClose: () => void;
  onOpenExternal: (url: string) => void;
  onReconnectDrive: () => void;
  /** Swaps the link for the saved file, or adds it; says what happened. */
  onSaved: (file: SavedDriveFileResult) => Promise<SaveLinkOutcome>;
  /** Starts Google sign-in again with the write permission (from a tap). */
  onStartAuthorization: () => void;
  /** The link being saved, or undefined to save a file from the device. */
  source?: SheetMusicSource;
  /** The track's own Drive folder, where the folder step opens first. */
  trackFolder?: DriveSaveFolder;
};

/**
 * Saves a sheet music file to the user's Drive: `Open the link`, `Choose the
 * downloaded file`, a destination folder, then the upload with a cancel. The
 * folder step is the Drive folder picker; every other step is the panel.
 */
export const SaveToDriveSheet = ({
  accessToken,
  dependencies,
  hasWriteAccess,
  isAuthorizing,
  onClose,
  onOpenExternal,
  onReconnectDrive,
  onSaved,
  onStartAuthorization,
  source,
  trackFolder,
}: SaveToDriveSheetProps) => {
  const flow = useSaveToDrive({
    accessToken,
    dependencies,
    mode: source ? 'link' : 'device',
    onSaved: async (file) => {
      const outcome = await onSaved(file);

      if (outcome === 'linked' && chosenNavigation.current) {
        void rememberSaveFolder(toSaveFolder(chosenNavigation.current));
      }

      return outcome;
    },
  });
  const [hasAskedForPermission, setHasAskedForPermission] = useState(false);
  const [remembered, setRemembered] = useState<DriveSaveFolder>();
  const chosenNavigation = useRef<DrivePickerNavigation | null>(null);

  useEffect(() => {
    let isCurrent = true;

    void restoreSaveFolder().then((folder) => {
      if (isCurrent) {
        setRemembered(folder);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  if (flow.state.step === 'folder' && hasWriteAccess) {
    return (
      <DriveFolderPickerSheet
        accessToken={accessToken}
        initialNavigation={createFolderPickerNavigation({
          remembered,
          trackFolder,
        })}
        onChoose={({ navigation, ...target }) => {
          chosenNavigation.current = navigation;
          flow.chooseFolder(target);
        }}
        onClose={flow.changeFile}
        onReconnectDrive={onReconnectDrive}
      />
    );
  }

  return (
    <BottomSheetSurface
      eyebrow="Sheet music"
      isVisible={true}
      onClose={onClose}
      title="Save to Drive"
    >
      <SaveFlowPanel
        hasAskedForPermission={hasAskedForPermission}
        hasWriteAccess={hasWriteAccess}
        isAuthorizing={isAuthorizing}
        onAllowSaving={() => {
          setHasAskedForPermission(true);
          onStartAuthorization();
        }}
        onCancelUpload={flow.cancelUpload}
        onChangeFolder={flow.changeFolder}
        onChooseFile={() => {
          void flow.chooseFile();
        }}
        onClose={onClose}
        onOpenLink={() => {
          if (source) {
            onOpenExternal(resolveExternalUrl(source));
            flow.markLinkOpened();
          }
        }}
        onRetry={flow.retry}
        state={flow.state}
      />
    </BottomSheetSurface>
  );
};
