import type { NamedLoop, Playlist } from '@org/audio-library-models';
import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';
import { useMemo } from 'react';

import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import type { DriveLibrarySource } from '../../library/drive/utils/drive-library-view-model';
import type { useSavedTrackPlayback } from '../../library/playback/hooks/use-saved-track-playback';

import type {
  RecentPlaylistRehearsalItem,
  RecentRehearsalItem,
} from './history';
import { RecentsScreen } from './index';
import {
  filterRecentsToExistingPlaylists,
  resolvePlaylistResumeEntryId,
  resolveRecentPlaylistItems,
} from './recent-playlist';

type AppRouterRecentsPlayback = Pick<
  ReturnType<typeof useSavedTrackPlayback>,
  | 'activePlayableItem'
  | 'activePlaylistSession'
  | 'playPlayableItem'
  | 'playbackState'
  | 'queuePlayableItemNext'
  | 'queuePlayableItemUpNext'
  | 'queuePlayableItemsUpNext'
  | 'togglePlaylistPlayback'
>;

type AppRouterRecentsScreenProps = {
  authorization: DriveSessionMenuController;
  libraryTagUsage: RehearsalLibraryTagUsage[];
  onRequestLibraryDestination: () => void;
  onSelectTag: (tag: string) => void;
  onViewAllTags: () => void;
  playback: AppRouterRecentsPlayback;
  recentRehearsalHistory: RecentRehearsalItem[];
  savedLoopIds: Set<string>;
  savedLoops: NamedLoop[];
  savedPlaylists: Playlist[];
  savedSourceIds: Set<string>;
  savedSources: DriveLibrarySource[];
  savedTrackCount: number;
};

export const AppRouterRecentsScreen = ({
  authorization,
  libraryTagUsage,
  onRequestLibraryDestination,
  onSelectTag,
  onViewAllTags,
  playback,
  recentRehearsalHistory,
  savedLoopIds,
  savedLoops,
  savedPlaylists,
  savedSourceIds,
  savedSources,
  savedTrackCount,
}: AppRouterRecentsScreenProps) => {
  // A playlist that was deleted leaves a stale row; hide it (it ages out).
  const visibleHistory = useMemo(() => {
    return filterRecentsToExistingPlaylists(
      recentRehearsalHistory,
      savedPlaylists,
    );
  }, [recentRehearsalHistory, savedPlaylists]);

  const findLibraryForPlaylist = (
    recentPlaylist: RecentPlaylistRehearsalItem,
  ) => {
    const playlist = savedPlaylists.find(({ id }) => id === recentPlaylist.id);

    return playlist
      ? { loops: savedLoops, playlist, sources: savedSources }
      : null;
  };

  return (
    <RecentsScreen
      activePlayableItemId={playback.activePlayableItem?.id ?? null}
      activePlaylistId={playback.activePlaylistSession?.playlistId ?? null}
      authorization={authorization}
      canQueueAsNext={playback.activePlayableItem !== null}
      isPlaybackActive={playback.playbackState === 'playing'}
      isRecentItemInLibrary={(recentRehearsal) => {
        if (recentRehearsal.kind === 'playlist') {
          return savedPlaylists.some(({ id }) => id === recentRehearsal.id);
        }

        if (recentRehearsal.playableItem.kind === 'loop') {
          if (!recentRehearsal.playableItem.loopId) {
            return false;
          }

          return savedLoopIds.has(recentRehearsal.playableItem.loopId);
        }

        return savedSourceIds.has(recentRehearsal.playableItem.sourceId);
      }}
      libraryTagUsage={libraryTagUsage}
      recentRehearsalHistory={visibleHistory}
      onQueueRecentPlaybackNext={(recentRehearsal) => {
        if (recentRehearsal.kind !== 'playlist') {
          playback.queuePlayableItemNext(recentRehearsal.playableItem);
        }
      }}
      onQueueRecentPlaybackUpNext={(recentRehearsal) => {
        if (recentRehearsal.kind !== 'playlist') {
          playback.queuePlayableItemUpNext(recentRehearsal.playableItem);
        }
      }}
      onQueueRecentPlaylist={(recentPlaylist) => {
        const library = findLibraryForPlaylist(recentPlaylist);

        if (library) {
          // Items that cannot be resolved are skipped, as in playlist playback.
          playback.queuePlayableItemsUpNext(
            resolveRecentPlaylistItems(library),
          );
        }
      }}
      onResumeRecentPlayback={(recentRehearsal) => {
        if (recentRehearsal.kind !== 'playlist') {
          void playback.playPlayableItem(recentRehearsal.playableItem);
          return;
        }

        const library = findLibraryForPlaylist(recentRehearsal);

        if (!library) {
          return;
        }

        // Plays as a playlist session, at the last track when it still plays.
        void playback.togglePlaylistPlayback({
          ...library,
          mode: 'ordered',
          startEntryId: resolvePlaylistResumeEntryId(recentRehearsal, library),
        });
      }}
      onSelectRecentShortcutTag={onSelectTag}
      onViewAllTags={onViewAllTags}
      onViewRecentInLibrary={() => {
        onRequestLibraryDestination();
      }}
      savedTrackCount={savedTrackCount}
    />
  );
};
