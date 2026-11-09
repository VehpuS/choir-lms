import type { Playlist } from '@org/audio-library-models';
import { useCallback, useEffect, useState } from 'react';

import { subscribeToSavedItemRequests } from '../components/saved-item-menu/saved-item-requests';
import { RecordingNoticeDialog } from '../recording/components/recording-notice-dialog';
import type { BulkAcknowledgment } from '../selection/bulk-playback-run';
import { CompositePlaylistPicker } from './list/composite-playlist-picker';
import { getCompositesSnapshot } from './store/composite-store-instance';

type CompositePlaylistRequestHostProps = {
  playlists: {
    savedPlaylists: Playlist[];
    createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
    updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  };
};

/**
 * The playlist sheet for `Add to playlist` in the playback menu of a playing
 * composite (composite-tracks 12.15). The playback sheet has no toast, so the
 * confirmation is its own short dialog, as for a recording.
 */
export const CompositePlaylistRequestHost = ({
  playlists,
}: CompositePlaylistRequestHostProps) => {
  const [compositeId, setCompositeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<BulkAcknowledgment | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    return subscribeToSavedItemRequests((request) => {
      if (request.action === 'composite-add-to-playlist') {
        setCompositeId(request.id);
      }
    });
  }, []);

  const composite = compositeId
    ? getCompositesSnapshot().find(({ id }) => id === compositeId)
    : undefined;

  return (
    <>
      {composite ? (
        <CompositePlaylistPicker
          composite={composite}
          createPlaylist={playlists.createPlaylist}
          onAdded={setNotice}
          onClose={() => setCompositeId(null)}
          playlists={playlists.savedPlaylists}
          updatePlaylist={playlists.updatePlaylist}
        />
      ) : null}
      {notice ? (
        <RecordingNoticeDialog
          message={notice.message}
          onDismiss={dismissNotice}
          title={notice.title}
        />
      ) : null}
    </>
  );
};
