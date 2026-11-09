import type {
  CompositeTrack,
  DriveAudioSource,
} from '@org/audio-library-models';
import { useEffect, useMemo, useState } from 'react';

import type { useGoogleDriveAuthorization } from '../../../auth/google-drive/hooks/use-authorization';
import { getPlaybackShapingSession } from '../../playback/shaping';
import { DriveFolderPickerSheet } from '../../sheet-music/drive-picker/drive-folder-picker-sheet';
import { getLibraryTrack } from '../library-tracks';
import { peekSessionMix } from '../mix/session-mix-store';
import { getCompositesSnapshot } from '../store/composite-store-instance';
import { buildCompositeExportModel } from './composite-export-model';
import { subscribeToCompositeExport } from './composite-export-request';
import { CompositeExportSheet } from './composite-export-sheet';
import { createCompositeExportDependencies } from './create-composite-export-dependencies';
import { useCompositeExport } from './use-composite-export';

type Authorization = Pick<
  ReturnType<typeof useGoogleDriveAuthorization>,
  'authState' | 'hasWriteAccess' | 'isBusy' | 'startAuthorization'
>;

/** The rate the estimate is made at before an audio context exists. */
const ESTIMATE_SAMPLE_RATE = 48_000;

type DialogProps = {
  authorization: Authorization;
  composite: CompositeTrack;
  onClose: () => void;
};

const ExportDialog = ({ authorization, composite, onClose }: DialogProps) => {
  const accessToken = authorization.authState.accessToken;
  // The mix and shaping as they are when the dialog opens: this export is of
  // that mix, and nothing in it changes the live session (task 10.3).
  const [snapshot] = useState(() => ({
    mix: peekSessionMix(composite).mix,
    shaping: {
      pitchSemitones:
        getPlaybackShapingSession().getState().effective.pitchSemitones,
      rate: getPlaybackShapingSession().getState().effective.speedMultiplier,
    },
  }));
  const dependencies = useMemo(
    () =>
      createCompositeExportDependencies({
        accessToken: accessToken ?? null,
        composite,
        getTrack: getLibraryTrack,
      }),
    [accessToken, composite],
  );
  const model = useMemo(() => {
    const tracks = new Map<string, DriveAudioSource>(
      composite.stems.flatMap((stem) => {
        const track = getLibraryTrack(stem.trackId);

        return track ? [[track.id, track] as const] : [];
      }),
    );

    return buildCompositeExportModel({
      composite,
      mix: snapshot.mix,
      sampleRate: dependencies?.sampleRate ?? ESTIMATE_SAMPLE_RATE,
      shaping: snapshot.shaping,
      tracks,
    });
  }, [composite, dependencies, snapshot]);
  const state = useCompositeExport({
    accessToken,
    compositeId: composite.id,
    dependencies,
    hasWriteAccess: authorization.hasWriteAccess,
    model,
    shaping: snapshot.shaping,
  });
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [hasAskedForPermission, setHasAskedForPermission] = useState(false);

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
    <CompositeExportSheet
      compositeName={composite.name}
      hasAskedForPermission={hasAskedForPermission}
      isAuthorizing={authorization.isBusy}
      isSupported={dependencies !== null}
      model={model}
      onAllowSaving={() => {
        setHasAskedForPermission(true);
        authorization.startAuthorization();
      }}
      onChooseFolder={() => setIsPickingFolder(true)}
      onClose={onClose}
      state={state}
    />
  );
};

/**
 * Opens the composite export dialog when the Mix panel's `Export…` asks for it.
 * It lives with the composite host because it holds the Drive session.
 */
export const CompositeExportHost = ({
  authorization,
}: {
  authorization: Authorization;
}) => {
  const [compositeId, setCompositeId] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeToCompositeExport(({ compositeId: id }) => setCompositeId(id)),
    [],
  );

  const composite = compositeId
    ? getCompositesSnapshot().find(({ id }) => id === compositeId)
    : undefined;

  return composite ? (
    <ExportDialog
      authorization={authorization}
      composite={composite}
      onClose={() => setCompositeId(null)}
    />
  ) : null;
};
