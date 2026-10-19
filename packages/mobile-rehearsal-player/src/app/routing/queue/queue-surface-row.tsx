import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { EqualizerMark } from '../../components/equalizer-mark';
import { OverflowMenuTrigger } from '../../components/overflow-menu-trigger';
import { RowMetaLine } from '../../components/row-meta-line';
import { ExplorerListRow } from '../../library/components/explorer';
import { OptionsMenuSheet } from '../../library/components/options-menu-sheet';
import {
  useHasLyrics,
  useIsPlayableItemSaved,
} from '../../library/components/saved-item-menu/saved-item-availability-context';
import {
  requestSavedItemAction,
  resolveSavedItemShortcuts,
} from '../../library/components/saved-item-menu/saved-item-requests';
import { appTheme } from '../../utils/theme';
import type { UpNextSurfaceSummary } from '../shell/shell-model';
import { getQueueRowPresentation } from './queue-surface-row-model';
import { queueStyles as styles } from './styles';

export type QueueSurfaceRowProps = {
  item: UpNextSurfaceSummary['items'][number];
  itemCount: number;
  isPlaybackLoading: boolean;
  isPlaybackToggleDisabled: boolean;
  isVisible: boolean;
  onCloseMenu: () => void;
  onMoveItemToEnd: (index: number) => void;
  onMoveItemToStart: (index: number) => void;
  onPlayItem: () => void;
  onRemoveItem: (index: number) => void;
  onRequestMoveToPosition: () => void;
  /** The arrows and drag handle from the shared reorderable list. */
  reorderControls: ReactNode;
  onShowMenu: () => void;
  onToggleCurrentPlayback: () => void;
  playbackToggleLabel: string;
  resolveItemIndex: () => number;
};

// One Up next row (1h): a position number (an equalizer mark for the current
// item), title over meta line, and a drag handle. Tapping plays the item.
export const QueueSurfaceRow = ({
  item,
  itemCount,
  isPlaybackLoading,
  isPlaybackToggleDisabled,
  isVisible,
  onCloseMenu,
  onMoveItemToEnd,
  onMoveItemToStart,
  onPlayItem,
  onRemoveItem,
  onRequestMoveToPosition,
  onShowMenu,
  onToggleCurrentPlayback,
  playbackToggleLabel,
  reorderControls,
  resolveItemIndex,
}: QueueSurfaceRowProps) => {
  const currentIndex = resolveItemIndex();
  const canMoveToStart = currentIndex > 0;
  const canMoveToEnd = currentIndex >= 0 && currentIndex < itemCount - 1;
  const canMoveToPosition = itemCount > 1 && currentIndex >= 0;
  const canRemove = !item.isCurrent;
  const isSaved = useIsPlayableItemSaved(item.itemRef);
  const hasLyrics = useHasLyrics(item.itemRef);
  // The Library's item actions, then this surface's own queue actions (task 8.26).
  const itemActions = resolveSavedItemShortcuts({
    hasLyrics,
    isSaved,
    item: item.itemRef,
  }).map((shortcut) => ({
    id: `${item.key}:${shortcut.id}`,
    label: shortcut.label,
    onPress: () => {
      onCloseMenu();
      requestSavedItemAction(shortcut.request);
    },
    section: 'item',
    tone: shortcut.tone,
  }));
  const presentation = getQueueRowPresentation({
    isCurrent: item.isCurrent,
    isLoading: isPlaybackLoading,
    playbackToggleLabel,
    title: item.title,
  });
  return (
    <View style={styles.rowDragSurface}>
      <ExplorerListRow
        accessibilityLabel={presentation.accessibilityLabel}
        actions={reorderControls}
        active={item.isCurrent}
        disabled={isPlaybackToggleDisabled}
        // Only the copy dims while the item loads; the drag handle and menu
        // stay usable, so they stay at full strength (task 8.36).
        disabledKeepsControls
        leadingIcon={
          item.isCurrent && isPlaybackLoading ? (
            <ActivityIndicator
              color={appTheme.colors.accentText}
              size="small"
            />
          ) : item.isCurrent ? (
            <EqualizerMark style={styles.equalizerSlot} />
          ) : (
            <Text style={styles.positionNumber}>{currentIndex + 1}</Text>
          )
        }
        metadata={
          <RowMetaLine
            leading={
              presentation.statusLabel ? (
                <Text style={styles.rowStatus}>{presentation.statusLabel}</Text>
              ) : null
            }
            text={item.detail}
          />
        }
        onPress={
          presentation.pressBehavior === 'toggle-current'
            ? onToggleCurrentPlayback
            : onPlayItem
        }
        overflowTrigger={
          <OverflowMenuTrigger
            accessibilityLabel={`More actions for ${item.title}`}
            onPress={onShowMenu}
            style={styles.rowOverflowTrigger}
          />
        }
        title={
          <Text
            numberOfLines={1}
            style={[
              styles.rowTitle,
              item.isCurrent ? styles.rowTitleCurrent : null,
            ]}
          >
            {item.title}
          </Text>
        }
      />
      <OptionsMenuSheet
        actions={[
          ...itemActions,
          {
            disabled: !canMoveToStart,
            id: `${item.key}:move-to-start`,
            section: 'queue',
            label: 'Move to start',
            onPress: () => {
              onCloseMenu();
              onMoveItemToStart(currentIndex);
            },
          },
          {
            disabled: !canMoveToEnd,
            id: `${item.key}:move-to-end`,
            section: 'queue',
            label: 'Move to end',
            onPress: () => {
              onCloseMenu();
              onMoveItemToEnd(currentIndex);
            },
          },
          {
            disabled: !canMoveToPosition,
            id: `${item.key}:move-to-position`,
            section: 'queue',
            label: 'Move to position',
            onPress: () => {
              onCloseMenu();
              onRequestMoveToPosition();
            },
          },
          {
            disabled: !canRemove,
            id: `${item.key}:remove`,
            section: 'queue',
            label: 'Remove from queue',
            onPress: () => {
              onCloseMenu();
              onRemoveItem(currentIndex);
            },
            tone: 'destructive',
          },
        ]}
        isVisible={isVisible}
        onClose={onCloseMenu}
        title={item.title}
      />
    </View>
  );
};
