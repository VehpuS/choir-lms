import type { NamedLoop, Playlist, Recording } from '@org/audio-library-models';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { subscribeToSavedItemRequests } from '../../components/saved-item-menu/saved-item-requests';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { resolveRecordingPlayback } from '../recording-playback-item';
import type { RecordingsView } from '../recordings-panel-model';
import type { useSavedTrackPlayback } from '../../playback/hooks/use-saved-track-playback';
import { getRecordingsStore } from '../recordings-store-instance';
import type { BulkAcknowledgment } from '../../selection/bulk-playback-run';
import { RecordingNoticeDialog } from './recording-notice-dialog';
import { RecordingPlaylistPicker } from './recording-playlist-picker';
import { RecordingsPanel } from './recordings-panel';

type RecordingsHostProps = {
  playlists: {
    savedPlaylists: Playlist[];
    createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
    updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  };
  library: {
    savedLibrarySources: readonly DriveLibrarySource[];
    savedLoops: readonly NamedLoop[];
  };
  playback: Pick<
    ReturnType<typeof useSavedTrackPlayback>,
    | 'activePlayableItem'
    | 'queuePlayableItemsNext'
    | 'queuePlayableItemsUpNext'
    | 'togglePlayableItemPlayback'
  >;
};

type PlaylistTarget = Recording | null;

type PanelTarget = { view: RecordingsView; viewName: string };

/**
 * Opens the Recordings panel when the playback menu asks for it over the
 * saved-item request channel, for a track, an adjusted track, or a loop.
 */
export const RecordingsHost = ({
  library,
  playback,
  playlists,
}: RecordingsHostProps) => {
  const { savedLibrarySources, savedLoops } = library;
  const [target, setTarget] = useState<PanelTarget | null>(null);
  const [playlistTarget, setPlaylistTarget] = useState<PlaylistTarget>(null);
  const [addedNotice, setAddedNotice] = useState<BulkAcknowledgment | null>(
    null,
  );
  const dismissNotice = useCallback(() => setAddedNotice(null), []);

  useEffect(() => {
    return subscribeToSavedItemRequests((request) => {
      if (request.action === 'add-recording-to-playlist') {
        // From the playback menu: the recording that is playing.
        void getRecordingsStore()
          .get(request.id)
          .then((recording) => setPlaylistTarget(recording));

        return;
      }

      if (request.action !== 'recordings') {
        return;
      }

      if (request.kind === 'loop') {
        const loop = savedLoops.find(({ id }) => id === request.id);

        setTarget(
          loop
            ? { view: { kind: 'loop', loopId: loop.id }, viewName: loop.name }
            : null,
        );

        return;
      }

      const source = savedLibrarySources.find(({ id }) => id === request.id);

      setTarget(
        source
          ? {
              view: {
                kind: source.adjustment ? 'adjusted' : 'track',
                sourceId: source.id,
              },
              viewName: source.name,
            }
          : null,
      );
    });
  }, [savedLibrarySources, savedLoops]);

  // Only plain saved tracks own recordings' originals and offline state.
  const tracks = useMemo(
    () => savedLibrarySources.filter((source) => !source.adjustment),
    [savedLibrarySources],
  );
  const recordingLibrary = useMemo(
    () => ({ sources: savedLibrarySources, loops: savedLoops }),
    [savedLibrarySources, savedLoops],
  );

  const picker = playlistTarget ? (
    <RecordingPlaylistPicker
      createPlaylist={playlists.createPlaylist}
      // The playback sheet has no toast, so the confirmation is its own dialog.
      onAdded={setAddedNotice}
      onClose={() => setPlaylistTarget(null)}
      playlists={playlists.savedPlaylists}
      recordings={[playlistTarget]}
      updatePlaylist={playlists.updatePlaylist}
    />
  ) : null;
  const notice = addedNotice ? (
    <RecordingNoticeDialog
      message={addedNotice.message}
      onDismiss={dismissNotice}
      title={addedNotice.title}
    />
  ) : null;

  if (!target) {
    return (
      <>
        {picker}
        {notice}
      </>
    );
  }

  const playRecording = (recording: Recording): string | null => {
    const resolution = resolveRecordingPlayback(recording, {
      sources: savedLibrarySources,
      loops: savedLoops,
    });

    if (resolution.kind === 'unavailable') {
      return resolution.message;
    }

    void playback.togglePlayableItemPlayback(resolution.item);
    setTarget(null);

    return null;
  };

  return (
    <>
      {notice}
      <RecordingsPanel
        library={recordingLibrary}
        onClose={() => setTarget(null)}
        onPlay={playRecording}
        playlists={playlists}
        queue={{
          canQueue: playback.activePlayableItem !== null,
          onQueued: () => undefined,
          queueNext: playback.queuePlayableItemsNext,
          queueUpNext: playback.queuePlayableItemsUpNext,
          resolve: (recording) => {
            const resolution = resolveRecordingPlayback(recording, {
              sources: savedLibrarySources,
              loops: savedLoops,
            });

            return resolution.kind === 'item' ? resolution.item : null;
          },
        }}
        sources={tracks}
        view={target.view}
        viewName={target.viewName}
      />
    </>
  );
};
