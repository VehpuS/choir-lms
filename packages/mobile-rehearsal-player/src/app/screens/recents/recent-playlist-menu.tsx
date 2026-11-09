import { OptionsMenuSheet } from '../../library/components/options-menu-sheet';
import type { RecentPlaylistRehearsalItem } from './history';
import { getRecentsOverflowActionState } from './overflow-actions';

type RecentPlaylistMenuProps = {
  canQueueAsNext: boolean;
  isInLibrary: boolean;
  isVisible: boolean;
  onClose: () => void;
  onQueuePlaylist: () => void;
  onViewInLibrary: () => void;
  recentPlaylist: RecentPlaylistRehearsalItem;
};

// A playlist row's menu: `Queue playlist` and `View in library`.
export const RecentPlaylistMenu = ({
  canQueueAsNext,
  isInLibrary,
  isVisible,
  onClose,
  onQueuePlaylist,
  onViewInLibrary,
  recentPlaylist,
}: RecentPlaylistMenuProps) => {
  const actions = getRecentsOverflowActionState({
    canQueueAsNext,
    isPlaylist: true,
    isViewInLibraryAvailable: isInLibrary,
  }).map((action) => ({
    ...action,
    onPress: () => {
      onClose();

      if (action.id === 'queue-playlist') {
        onQueuePlaylist();
      } else {
        onViewInLibrary();
      }
    },
    section: 'row',
  }));

  return (
    <OptionsMenuSheet
      actions={actions}
      isVisible={isVisible}
      onClose={onClose}
      title={recentPlaylist.title}
    />
  );
};
