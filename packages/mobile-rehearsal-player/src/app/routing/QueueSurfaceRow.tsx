import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useRef } from 'react';
import { PanResponder, Text, View } from 'react-native';

import { CompactPlayableRowShell } from '../components/CompactPlayableRowShell';
import { OverflowMenuTrigger } from '../components/OverflowMenuTrigger';
import { OptionsMenuSheet } from '../library/components/OptionsMenuSheet';

import { SurfaceIconButton } from './PlaybackSurfaceControls';
import { styles } from './playback-surface-styles';
import { getQueueRowPlaybackAction } from './queue-surface-row-model';
import type { UpNextSurfaceSummary } from './shell-model';

export type QueueSurfaceRowProps = {
  item: UpNextSurfaceSummary['items'][number];
  itemCount: number;
  isPlaybackToggleDisabled: boolean;
  isVisible: boolean;
  onCloseMenu: () => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onMoveItemToEnd: (index: number) => void;
  onMoveItemToStart: (index: number) => void;
  onPlayItem: () => void;
  onRemoveItem: (index: number) => void;
  onSetDragActive: (isActive: boolean) => void;
  onShowMenu: () => void;
  onToggleCurrentPlayback: () => void;
  playbackToggleLabel: string;
  resolveItemIndex: () => number;
};

export const QueueSurfaceRow = ({
  item,
  itemCount,
  isPlaybackToggleDisabled,
  isVisible,
  onCloseMenu,
  onMoveItem,
  onMoveItemToEnd,
  onMoveItemToStart,
  onPlayItem,
  onRemoveItem,
  onSetDragActive,
  onShowMenu,
  onToggleCurrentPlayback,
  playbackToggleLabel,
  resolveItemIndex,
}: QueueSurfaceRowProps) => {
  const dragAnchorMoveYRef = useRef<number | null>(null);
  const measuredItemHeightRef = useRef(88);
  const currentIndex = resolveItemIndex();
  const canMoveToStart = currentIndex > 0;
  const canMoveToEnd = currentIndex >= 0 && currentIndex < itemCount - 1;
  const canRemove = !item.isCurrent;
  const canDragReorder = itemCount > 1;
  const playbackAction = getQueueRowPlaybackAction({
    isCurrent: item.isCurrent,
    playbackToggleLabel,
    title: item.title,
  });

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => {
        return canDragReorder;
      },
      onStartShouldSetPanResponderCapture: () => {
        return canDragReorder;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return canDragReorder && Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return canDragReorder && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderTerminationRequest: () => {
        return false;
      },
      onShouldBlockNativeResponder: () => {
        return true;
      },
      onPanResponderGrant: () => {
        onSetDragActive(true);
        dragAnchorMoveYRef.current = null;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!canDragReorder) {
          return;
        }

        if (dragAnchorMoveYRef.current === null) {
          dragAnchorMoveYRef.current = gestureState.moveY;
          return;
        }

        const stepDistance = Math.max(measuredItemHeightRef.current * 0.82, 44);
        let delta = gestureState.moveY - dragAnchorMoveYRef.current;

        while (Math.abs(delta) >= stepDistance) {
          const direction = delta > 0 ? 1 : -1;
          const activeIndex = resolveItemIndex();

          if (activeIndex < 0) {
            break;
          }

          const nextIndex = Math.min(
            Math.max(activeIndex + direction, 0),
            itemCount - 1,
          );

          if (nextIndex === activeIndex) {
            break;
          }

          onMoveItem(activeIndex, nextIndex);
          dragAnchorMoveYRef.current += direction * stepDistance;
          delta = gestureState.moveY - dragAnchorMoveYRef.current;
        }
      },
      onPanResponderRelease: () => {
        onSetDragActive(false);
        dragAnchorMoveYRef.current = null;
      },
      onPanResponderTerminate: () => {
        onSetDragActive(false);
        dragAnchorMoveYRef.current = null;
      },
    });
  }, [
    canDragReorder,
    itemCount,
    onMoveItem,
    onSetDragActive,
    resolveItemIndex,
  ]);

  return (
    <View
      onLayout={(event) => {
        const measuredHeight = event.nativeEvent.layout.height;

        if (measuredHeight > 0) {
          measuredItemHeightRef.current = measuredHeight;
        }
      }}
      style={[
        styles.queueCard,
        item.isCurrent ? styles.queueCardCurrent : null,
      ]}
    >
      <Text style={styles.queueEyebrow}>
        {item.isCurrent ? 'Now playing' : 'Up next'}
      </Text>
      <CompactPlayableRowShell
        actions={
          <>
            <SurfaceIconButton
              accessibilityLabel={playbackAction.accessibilityLabel}
              disabled={isPlaybackToggleDisabled}
              icon={playbackAction.iconName}
              onPress={
                playbackAction.pressBehavior === 'toggle-current'
                  ? onToggleCurrentPlayback
                  : onPlayItem
              }
              size={18}
            />
            <View
              accessibilityLabel={`Drag ${item.title} to reorder`}
              accessibilityRole="adjustable"
              style={[
                styles.queueRowDragHandle,
                !canDragReorder ? styles.queueRowDragHandleDisabled : null,
              ]}
              {...(canDragReorder ? panResponder.panHandlers : {})}
            >
              <MaterialCommunityIcons color="#5f5647" name="drag" size={18} />
            </View>
          </>
        }
        metadata={<Text style={styles.queueDetail}>{item.detail}</Text>}
        overflowTrigger={
          <OverflowMenuTrigger
            accessibilityLabel={`More actions for ${item.title}`}
            onPress={onShowMenu}
            style={styles.queueOverflowTrigger}
          />
        }
        style={styles.queueRowShell}
        title={<Text style={styles.queueTitle}>{item.title}</Text>}
        variant="row"
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
            disabled: true,
            id: `${item.key}:move-to-position`,
            label: 'Move to position',
            onPress: onCloseMenu,
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
