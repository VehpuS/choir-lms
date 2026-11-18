import type { PlayableItem } from '@org/audio-library-models';

import {
  getListeningFallbackLabel,
  useListeningFallback,
} from '../../../library/playback/listening-engine/listening-fallback-state';
import { getListeningLoadLabel } from '../../../library/playback/listening-engine/listening-load-label';
import { useListeningLoadState } from '../../../library/playback/listening-engine/listening-load-state';
import { useSavedTrackDownloadProgress } from '../../../library/playback/hooks/use-saved-track-download-progress';
import type { SavedTrackPlaybackState } from '../../../library/playback/utils/saved-track-playback-view-model';
import { getPlaybackDownloadLabel } from '../../../library/playback/utils/saved-track-download-label';
import type { PlaylistPlaybackSession } from '../../../library/playlists/utils/saved-playlist-playback-view-model';
import {
  getMiniPlayerSummary,
  getNowPlayingSurfaceSummary,
  getUpNextSurfaceSummary,
} from '../shell-model';

type Options = {
  activePlayableItem: PlayableItem | null;
  activePlaylistSession: PlaylistPlaybackSession | null;
  isPlaybackPreparing: boolean;
  playbackPositionSeconds: number;
  playbackShapingLabel: string | null;
  playbackState: SavedTrackPlaybackState | undefined;
};

/**
 * Everything the shell shows about what is playing: the mini-player line, the
 * Now Playing sheet, the Up next sheet, and (on the web) how far the download
 * of the playing file has got.
 */
export const useMobileShellPlaybackSummaries = ({
  activePlayableItem,
  activePlaylistSession,
  isPlaybackPreparing,
  playbackPositionSeconds,
  playbackShapingLabel,
  playbackState,
}: Options) => {
  const summaryOptions = {
    activePlayableItem,
    activePlaylistSession,
    isPlaybackPreparing,
    playbackPositionSeconds,
    playbackState,
    shapingLabel: playbackShapingLabel,
  };
  // Web playback downloads the whole file before it can play (8.33), so the
  // mini-player and sheet say how far that download has got.
  const downloadProgress = useSavedTrackDownloadProgress();
  // With a microphone open the track is prepared for the engine instead, once.
  const listeningLoadLabel = getListeningLoadLabel(useListeningLoadState());
  // Or it could not be prepared and stays on the media element: said once.
  const listeningFallbackLabel = getListeningFallbackLabel(
    useListeningFallback(),
    activePlayableItem?.source.id ?? null,
  );

  return {
    miniPlayerSummary: getMiniPlayerSummary(summaryOptions),
    nowPlayingSummary: getNowPlayingSurfaceSummary(summaryOptions),
    // A playing track can be prepared too (the microphone opened under it).
    playbackDownloadLabel:
      listeningLoadLabel ??
      listeningFallbackLabel ??
      (isPlaybackPreparing ? getPlaybackDownloadLabel(downloadProgress) : null),
    upNextSummary: getUpNextSurfaceSummary({ activePlaylistSession }),
  };
};
