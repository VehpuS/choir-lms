import { useIsPlayableItemSaved } from '../../library/components/saved-item-menu/saved-item-availability-context';
import {
  requestSavedItemAction,
  resolveSavedItemShortcuts,
} from '../../library/components/saved-item-menu/saved-item-requests';
import { OptionsMenuSheet } from '../../library/components/options-menu-sheet';
import type { RecentRehearsalItem } from './history';
import { getRecentsOverflowActionState } from './overflow-actions';

type RecentRehearsalMenuProps = {
  canQueueAsNext: boolean;
  isInLibrary: boolean;
  isVisible: boolean;
  onClose: () => void;
  onQueueNext: () => void;
  onQueueUpNext: () => void;
  onViewInLibrary: () => void;
  recentRehearsal: RecentRehearsalItem;
};

// A Recents row's menu: its own actions (queueing, `View in library`) and the
// Library's item actions for a saved track or loop (task 8.26).
export const RecentRehearsalMenu = ({
  canQueueAsNext,
  isInLibrary,
  isVisible,
  onClose,
  onQueueNext,
  onQueueUpNext,
  onViewInLibrary,
  recentRehearsal,
}: RecentRehearsalMenuProps) => {
  const isSaved = useIsPlayableItemSaved(recentRehearsal.playableItem);
  const runAndClose = (run: () => void) => () => {
    onClose();
    run();
  };
  const ownActions = getRecentsOverflowActionState({
    canQueueAsNext,
    isViewInLibraryAvailable: isInLibrary,
  }).map((action) => ({
    ...action,
    onPress: runAndClose(
      action.id === 'play-next'
        ? onQueueNext
        : action.id === 'add-to-queue'
          ? onQueueUpNext
          : onViewInLibrary,
    ),
    section: 'row',
  }));
  const itemActions = resolveSavedItemShortcuts({
    isSaved,
    item: recentRehearsal.playableItem,
  }).map((shortcut) => ({
    id: shortcut.id,
    label: shortcut.label,
    onPress: runAndClose(() => {
      requestSavedItemAction(shortcut.request);
    }),
    section: 'item',
    tone: shortcut.tone,
  }));

  return (
    <OptionsMenuSheet
      actions={[...ownActions, ...itemActions]}
      isVisible={isVisible}
      onClose={onClose}
      title={recentRehearsal.title}
    />
  );
};
