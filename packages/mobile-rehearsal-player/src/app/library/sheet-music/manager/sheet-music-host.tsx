import {
  detectSheetMusicFormat,
  type NamedLoop,
} from '@org/audio-library-models';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

import type { useGoogleDriveAuthorization } from '../../../auth/google-drive/hooks/use-authorization';
import type { useSavedTrackPlayback } from '../../playback/hooks/use-saved-track-playback';
import { subscribeToSavedItemRequests } from '../../components/saved-item-menu/saved-item-requests';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  type SheetMusicItem,
  type useSourceSheetMusic,
} from '../hooks/use-source-sheet-music';
import { suggestSheetMusicQuery } from '../sheet-music-search-terms';
import { SheetMusicViewer } from '../viewer';
import { isViewableSource, resolveExternalUrl } from '../viewer/model';
import { createDriveAddition } from '../drive-picker/model';
import { DriveSheetMusicPickerSheet } from '../drive-picker/drive-sheet-music-picker-sheet';
import { SheetMusicManagerSheet } from './sheet-music-manager-sheet';
import type { SaveLinkOutcome } from '../save-to-drive/save-flow-model';
import { SaveToDriveSheet } from '../save-to-drive/save-to-drive-sheet';
import type { SavedDriveFileResult } from '../save-to-drive/use-save-to-drive';

type SheetMusicHostProps = {
  authorization: Pick<
    ReturnType<typeof useGoogleDriveAuthorization>,
    'authState' | 'hasWriteAccess' | 'isBusy' | 'startAuthorization'
  >;
  library: {
    savedLibrarySources: readonly DriveLibrarySource[];
    savedLoops: readonly NamedLoop[];
    sheetMusic: ReturnType<typeof useSourceSheetMusic>;
  };
  playback: Pick<
    ReturnType<typeof useSavedTrackPlayback>,
    | 'activePlayableItem'
    | 'isPreparing'
    | 'playbackState'
    | 'toggleActivePlayback'
  >;
};

/** What the Save to Drive sheet is saving: a link the browser could not read, or a device file. */
type SaveTarget = { kind: 'device' } | { kind: 'link'; sourceId: string };

// The browser's file chooser is the only way to read a device file today.
const CAN_SAVE_TO_DRIVE = Platform.OS === 'web';

/**
 * Opens the sheet music manager when any menu asks for it over the saved-item
 * request channel, and the full-screen viewer from a source's `View`. A loop or
 * adjusted track manages its owning track's list (design Decision 8).
 */
export const SheetMusicHost = ({
  authorization,
  library,
  playback,
}: SheetMusicHostProps) => {
  const { savedLibrarySources, savedLoops, sheetMusic } = library;
  const [item, setItem] = useState<SheetMusicItem | null>(null);
  const [viewerSourceId, setViewerSourceId] = useState<string | null>(null);
  const [isPickingFromDrive, setIsPickingFromDrive] = useState(false);
  // Remounting the manager after a Drive pick returns it to the list.
  const [managerKey, setManagerKey] = useState(0);
  const [saveTarget, setSaveTarget] = useState<SaveTarget | null>(null);
  // The track's source count when a device file was added, so the viewer opens
  // on the new source once the refreshed list has it.
  const [openAfterCount, setOpenAfterCount] = useState<number | null>(null);

  useEffect(() => {
    return subscribeToSavedItemRequests((request) => {
      if (request.action !== 'sheet-music') {
        return;
      }

      if (request.kind === 'loop') {
        const loop = savedLoops.find(({ id }) => id === request.id);

        setItem(loop ? { id: loop.id, sourceId: loop.sourceId } : null);
        return;
      }

      const source = savedLibrarySources.find(({ id }) => id === request.id);

      setItem(source ?? null);
    });
  }, [savedLibrarySources, savedLoops]);

  const resolution = item ? sheetMusic.sheetMusicFor(item) : null;
  const currentSources = resolution?.sheetMusic;
  // Read when an upload finishes, which can be long after the sheet opened.
  const sourcesRef = useRef(currentSources);

  sourcesRef.current = currentSources;

  useEffect(() => {
    if (openAfterCount === null || !currentSources) {
      return;
    }

    const added = currentSources[currentSources.length - 1];

    if (currentSources.length > openAfterCount && added) {
      setViewerSourceId(added.id);
      setOpenAfterCount(null);
    }
  }, [currentSources, openAfterCount]);

  if (!item || !resolution?.owner) {
    return null;
  }

  const { owner, sheetMusic: sources } = resolution;
  const openExternal = (url: string) => {
    void Linking.openURL(url);
  };
  const linkToSave =
    saveTarget?.kind === 'link'
      ? sources.find(({ id }) => id === saveTarget.sourceId)
      : undefined;

  // A saved file replaces the link (keeping its id, label, and part selection)
  // or, from the device, is added as a new Drive source; the viewer then opens
  // on it. A link removed while the upload ran is reported, not brought back.
  const linkSavedFile = async (
    file: SavedDriveFileResult,
  ): Promise<SaveLinkOutcome> => {
    if (saveTarget?.kind === 'link') {
      const { sourceId } = saveTarget;

      if (!sourcesRef.current?.some(({ id }) => id === sourceId)) {
        return 'source-removed';
      }

      if (
        !(await sheetMusic.replaceSheetMusicWithDrive(item, sourceId, file))
      ) {
        return 'failed';
      }

      setSaveTarget(null);
      setViewerSourceId(sourceId);

      return 'linked';
    }

    const format = detectSheetMusicFormat({ name: file.name });
    const countBefore = sourcesRef.current?.length ?? 0;
    const wasAdded =
      format !== 'refused' &&
      format !== 'link' &&
      (await sheetMusic.addSheetMusic(
        item,
        createDriveAddition({
          format,
          id: file.fileId,
          mimeType: '',
          name: file.name,
        }),
      ));

    if (!wasAdded) {
      return 'failed';
    }

    setSaveTarget(null);
    setManagerKey((key) => key + 1);
    setOpenAfterCount(countBefore);

    return 'linked';
  };

  return (
    <>
      <SheetMusicManagerSheet
        key={managerKey}
        canMutate={true}
        onAddLink={(addition) => sheetMusic.addSheetMusic(item, addition)}
        onChooseDevice={
          CAN_SAVE_TO_DRIVE
            ? () => setSaveTarget({ kind: 'device' })
            : undefined
        }
        onChooseDrive={() => {
          setIsPickingFromDrive(true);
        }}
        onClose={() => {
          setItem(null);
          setSaveTarget(null);
          setViewerSourceId(null);
          setIsPickingFromDrive(false);
        }}
        onOpenExternal={openExternal}
        onOpenSource={(source) => {
          if (isViewableSource(source)) {
            setViewerSourceId(source.id);
            return;
          }

          openExternal(resolveExternalUrl(source));
        }}
        onRemove={(source) => sheetMusic.removeSheetMusic(item, source.id)}
        onRename={(source, label) =>
          sheetMusic.updateSheetMusic(item, source.id, { label })
        }
        onSaveToDrive={
          CAN_SAVE_TO_DRIVE
            ? (source) => setSaveTarget({ kind: 'link', sourceId: source.id })
            : undefined
        }
        ownerName={owner.name}
        sources={sources}
        suggestedQuery={suggestSheetMusicQuery(owner.name)}
      />
      {isPickingFromDrive ? (
        <DriveSheetMusicPickerSheet
          existingSources={sources}
          accessToken={authorization.authState.accessToken}
          onClose={() => {
            setIsPickingFromDrive(false);
          }}
          onPick={(file) => {
            void sheetMusic
              .addSheetMusic(item, createDriveAddition(file))
              .then((wasAdded) => {
                if (wasAdded) {
                  setIsPickingFromDrive(false);
                  setManagerKey((key) => key + 1);
                }
              });
          }}
          onReconnectDrive={authorization.startAuthorization}
        />
      ) : null}
      {viewerSourceId ? (
        <SheetMusicViewer
          getDriveAccessToken={() => authorization.authState.accessToken}
          initialSourceId={viewerSourceId}
          isPlaybackToggleDisabled={
            playback.activePlayableItem === null || playback.isPreparing
          }
          isPlaying={playback.playbackState === 'playing'}
          onChangePartSelection={(sourceId, partSelection) => {
            void sheetMusic.updateSheetMusic(item, sourceId, { partSelection });
          }}
          onClose={() => {
            setViewerSourceId(null);
          }}
          onOpenExternal={openExternal}
          onReconnectDrive={authorization.startAuthorization}
          onSaveToDrive={
            CAN_SAVE_TO_DRIVE
              ? (source) => setSaveTarget({ kind: 'link', sourceId: source.id })
              : undefined
          }
          onTogglePlayback={() => {
            void playback.toggleActivePlayback();
          }}
          ownerName={owner.name}
          sources={sources}
        />
      ) : null}
      {saveTarget && (saveTarget.kind === 'device' || linkToSave) ? (
        <SaveToDriveSheet
          accessToken={authorization.authState.accessToken}
          hasWriteAccess={authorization.hasWriteAccess}
          isAuthorizing={authorization.isBusy}
          onClose={() => setSaveTarget(null)}
          onOpenExternal={openExternal}
          onReconnectDrive={authorization.startAuthorization}
          onSaved={linkSavedFile}
          onStartAuthorization={authorization.startAuthorization}
          source={linkToSave}
          trackFolder={owner.sourceLocation}
        />
      ) : null}
    </>
  );
};
