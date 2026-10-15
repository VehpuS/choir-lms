import type { NamedLoop } from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import type { useGoogleDriveAuthorization } from '../../../auth/google-drive/hooks/use-authorization';
import type { useSavedTrackPlayback } from '../../playback/hooks/use-saved-track-playback';
import { subscribeToSavedItemRequests } from '../../components/saved-item-menu/saved-item-requests';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  type SheetMusicItem,
  type useSourceSheetMusic,
} from '../hooks/use-source-sheet-music';
import { suggestSheetMusicTitle } from '../sheet-music-search-terms';
import { SheetMusicViewer } from '../viewer';
import { isViewableSource, resolveExternalUrl } from '../viewer/model';
import { SheetMusicManagerSheet } from './sheet-music-manager-sheet';

type SheetMusicHostProps = {
  authorization: Pick<
    ReturnType<typeof useGoogleDriveAuthorization>,
    'authState' | 'startAuthorization'
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

  if (!item || !resolution?.owner) {
    return null;
  }

  const { owner, sheetMusic: sources } = resolution;
  const openExternal = (url: string) => {
    void Linking.openURL(url);
  };

  return (
    <>
      <SheetMusicManagerSheet
        canMutate={true}
        onAddLink={(addition) => sheetMusic.addSheetMusic(item, addition)}
        onClose={() => {
          setItem(null);
          setViewerSourceId(null);
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
        ownerName={owner.name}
        sources={sources}
        suggestedTitle={suggestSheetMusicTitle(owner.name)}
      />
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
          onTogglePlayback={() => {
            void playback.toggleActivePlayback();
          }}
          ownerName={owner.name}
          sources={sources}
        />
      ) : null}
    </>
  );
};
