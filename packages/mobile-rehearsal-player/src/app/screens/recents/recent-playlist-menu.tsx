import { OptionsMenuSheet } from '../../library/components/options-menu-sheet';
import type { RecentPlaylistRehearsalItem } from './history';
import { getRecentPlaylistMenuActions } from './recent-playlist-menu-actions';

type RecentPlaylistMenuProps = {
  canQueueAsNext: boolean;
  isInLibrary: boolean;
  isVisible: boolean;
  onClose: () => void;
  onQueuePlaylist: () => void;
  onViewInLibrary: () => void;
  recentPlaylist: RecentPlaylistRehearsalItem;
};

export const RecentPlaylistMenu = ({
  canQueueAsNext,
  isInLibrary,
  isVisible,
  onClose,
  onQueuePlaylist,
  onViewInLibrary,
  recentPlaylist,
}: RecentPlaylistMenuProps) => {
  return (
    <OptionsMenuSheet
      actions={getRecentPlaylistMenuActions({
        canQueueAsNext,
        isInLibrary,
        onClose,
        onQueuePlaylist,
        onViewInLibrary,
        playlistId: recentPlaylist.id,
      })}
      isVisible={isVisible}
      onClose={onClose}
      title={recentPlaylist.title}
    />
  );
};
