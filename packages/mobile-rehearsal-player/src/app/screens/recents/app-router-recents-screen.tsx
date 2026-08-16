import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';

import type { DriveSessionMenuController } from '../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import type { useSavedTrackPlayback } from '../../library/playback/hooks/use-saved-track-playback';

import type { RecentRehearsalItem } from './history';
import { RecentsScreen } from './index';

type AppRouterRecentsPlayback = Pick<
  ReturnType<typeof useSavedTrackPlayback>,
  | 'activePlayableItem'
  | 'playPlayableItem'
  | 'playbackState'
  | 'queuePlayableItemNext'
  | 'queuePlayableItemUpNext'
>;

type AppRouterRecentsScreenProps = {
  authorization: DriveSessionMenuController;
  libraryTagUsage: RehearsalLibraryTagUsage[];
  onRequestLibraryDestination: () => void;
  playback: AppRouterRecentsPlayback;
  recentRehearsalHistory: RecentRehearsalItem[];
  savedLoopIds: Set<string>;
  savedSourceIds: Set<string>;
  savedTrackCount: number;
};

export const AppRouterRecentsScreen = ({
  authorization,
  libraryTagUsage,
  onRequestLibraryDestination,
  playback,
  recentRehearsalHistory,
  savedLoopIds,
  savedSourceIds,
  savedTrackCount,
}: AppRouterRecentsScreenProps) => {
  return (
    <RecentsScreen
      activePlayableItemId={playback.activePlayableItem?.id ?? null}
      authorization={authorization}
      canQueueAsNext={playback.activePlayableItem !== null}
      isPlaybackActive={playback.playbackState === 'playing'}
      isRecentItemInLibrary={(recentRehearsal) => {
        if (recentRehearsal.playableItem.kind === 'loop') {
          if (!recentRehearsal.playableItem.loopId) {
            return false;
          }

          return savedLoopIds.has(recentRehearsal.playableItem.loopId);
        }

        return savedSourceIds.has(recentRehearsal.playableItem.sourceId);
      }}
      libraryTagUsage={libraryTagUsage}
      recentRehearsalHistory={recentRehearsalHistory}
      onPlayRecentShortcut={() => {
        const mostRecentItem = recentRehearsalHistory[0];

        if (!mostRecentItem) {
          return;
        }

        void playback.playPlayableItem(mostRecentItem.playableItem);
      }}
      onQueueRecentPlaybackNext={(recentRehearsal) => {
        playback.queuePlayableItemNext(recentRehearsal.playableItem);
      }}
      onQueueRecentPlaybackUpNext={(recentRehearsal) => {
        playback.queuePlayableItemUpNext(recentRehearsal.playableItem);
      }}
      onResumeRecentPlayback={(recentRehearsal) => {
        void playback.playPlayableItem(recentRehearsal.playableItem);
      }}
      onViewRecentInLibrary={() => {
        onRequestLibraryDestination();
      }}
      savedTrackCount={savedTrackCount}
    />
  );
};
