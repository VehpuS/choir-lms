import { Text, View } from 'react-native';

import { DragHandle } from '../../components/drag-handle';
import { EqualizerMark } from '../../components/equalizer-mark';
import { OverflowMenuTrigger } from '../../components/overflow-menu-trigger';
import { RowMetaLine } from '../../components/row-meta-line';
import { ExplorerListRow } from '../../library/components/explorer';
import { OptionsMenuSheet } from '../../library/components/options-menu-sheet';
import type { UpNextSurfaceSummary } from '../shell/shell-model';
import { getQueueRowPresentation } from './queue-surface-row-model';
import { queueStyles as styles } from './styles';
import { useQueueRowDrag } from './use-queue-row-drag';

export type QueueSurfaceRowProps = {
  item: UpNextSurfaceSummary['items'][number];
  itemCount: number;
  isPlaybackLoading: boolean;
  isPlaybackToggleDisabled: boolean;
  isVisible: boolean;
  onCloseMenu: () => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onMoveItemToEnd: (index: number) => void;
  onMoveItemToStart: (index: number) => void;
  onPlayItem: () => void;
  onRemoveItem: (index: number) => void;
  onRequestMoveToPosition: () => void;
  onSetDragActive: (isActive: boolean) => void;
  onShowMenu: () => void;
  onToggleCurrentPlayback: () => void;
  playbackToggleLabel: string;
  resolveItemIndex: () => number;
};

// One Up Next row (1h): a position number (an equalizer mark for the current
// item), title over meta line, and a drag handle. Tapping plays the item.
export const QueueSurfaceRow = ({
  item,
  itemCount,
  isPlaybackLoading,
  isPlaybackToggleDisabled,
  isVisible,
  onCloseMenu,
  onMoveItem,
  onMoveItemToEnd,
  onMoveItemToStart,
  onPlayItem,
  onRemoveItem,
  onRequestMoveToPosition,
  onSetDragActive,
  onShowMenu,
  onToggleCurrentPlayback,
  playbackToggleLabel,
  resolveItemIndex,
}: QueueSurfaceRowProps) => {
  const currentIndex = resolveItemIndex();
  const canMoveToStart = currentIndex > 0;
  const canMoveToEnd = currentIndex >= 0 && currentIndex < itemCount - 1;
  const canMoveToPosition = itemCount > 1 && currentIndex >= 0;
  const canRemove = !item.isCurrent;
  const canDragReorder = itemCount > 1;
  const presentation = getQueueRowPresentation({
    isCurrent: item.isCurrent,
    isLoading: isPlaybackLoading,
    playbackToggleLabel,
    title: item.title,
  });
  const { onRowLayout, panHandlers } = useQueueRowDrag({
    canDragReorder,
    itemCount,
    onMoveItem,
    onSetDragActive,
    resolveItemIndex,
  });

  return (
    <View
      onLayout={(event) => {
        onRowLayout(event.nativeEvent.layout.height);
      }}
    >
      <ExplorerListRow
        accessibilityLabel={presentation.accessibilityLabel}
        actions={
          <DragHandle
            accessibilityLabel={`Drag ${item.title} to reorder`}
            canDrag={canDragReorder}
            panHandlers={panHandlers}
          />
        }
        active={item.isCurrent}
        disabled={isPlaybackToggleDisabled}
        leadingIcon={
          item.isCurrent ? (
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
          {
            disabled: !canMoveToStart,
            id: `${item.key}:move-to-start`,
            label: 'Move to start',
            onPress: () => {
              onCloseMenu();
              onMoveItemToStart(currentIndex);
            },
          },
          {
            disabled: !canMoveToEnd,
            id: `${item.key}:move-to-end`,
            label: 'Move to end',
            onPress: () => {
              onCloseMenu();
              onMoveItemToEnd(currentIndex);
            },
          },
          {
            disabled: !canMoveToPosition,
            id: `${item.key}:move-to-position`,
            label: 'Move to position',
            onPress: () => {
              onCloseMenu();
              onRequestMoveToPosition();
            },
          },
          {
            disabled: !canRemove,
            id: `${item.key}:remove`,
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
