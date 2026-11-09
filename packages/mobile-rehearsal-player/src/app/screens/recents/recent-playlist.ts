import type {
  CompositeTrack,
  NamedLoop,
  Playlist,
  Recording,
} from '@org/audio-library-models';
import { resolvePlaylistItems } from '@org/audio-library-runtime';

import { getCompositesSnapshot } from '../../library/composite/store/composite-store-instance';
import type { DriveLibrarySource } from '../../library/drive/utils/drive-library-view-model';
import { getRecordingsSnapshot } from '../../library/recording/recordings-store-instance';
import type {
  RecentPlaylistRehearsalItem,
  RecentRehearsalItem,
} from './history';

type PlaylistResumeLibrary = {
  composites?: readonly CompositeTrack[];
  loops: NamedLoop[];
  playlist: Playlist;
  recordings?: readonly Recording[];
  sources: DriveLibrarySource[];
};

/** The playlist's items that can play now, in playlist order. */
export const resolveRecentPlaylistItems = (library: PlaylistResumeLibrary) => {
  return resolvePlaylistItems(
    library.playlist,
    library.loops,
    library.sources,
    library.recordings ?? getRecordingsSnapshot(),
    library.composites ?? getCompositesSnapshot(),
  );
};

/**
 * The entry to restart a recent playlist at, or undefined to start it from the
 * top. The last entry is checked at resume time against what can still play, so
 * the stored id never needs cleaning up. A removed or unplayable entry must not
 * be passed on: playlist playback refuses a start entry it cannot play instead
 * of falling back.
 */
export const resolvePlaylistResumeEntryId = (
  recentPlaylist: Pick<RecentPlaylistRehearsalItem, 'lastEntryId'>,
  library: PlaylistResumeLibrary,
) => {
  const isLastEntryPlayable = resolveRecentPlaylistItems(library).some(
    (item) => item.playlistEntryId === recentPlaylist.lastEntryId,
  );

  return isLastEntryPlayable ? recentPlaylist.lastEntryId : undefined;
};

/** Hides playlist rows whose playlist was deleted; the rows age out via the cap. */
export const filterRecentsToExistingPlaylists = (
  history: RecentRehearsalItem[],
  playlists: readonly Pick<Playlist, 'id'>[],
) => {
  const playlistIds = new Set(playlists.map((playlist) => playlist.id));

  return history.filter(
    (item) => item.kind !== 'playlist' || playlistIds.has(item.id),
  );
};
