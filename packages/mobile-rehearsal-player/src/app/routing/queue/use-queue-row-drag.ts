import { useMemo, useRef } from 'react';
import { PanResponder } from 'react-native';

// Until the row reports its real height, assume about one 1h row.
const DEFAULT_ROW_HEIGHT = 62;
const MIN_DRAG_STEP_DISTANCE = 44;
const DRAG_STEP_HEIGHT_RATIO = 0.82;
const DRAG_START_DISTANCE = 5;

/**
 * Drag-to-reorder for one queue row: the handle's pan gesture moves the item
 * one slot each time it travels a row's height, through `onMoveItem`.
 */
export const useQueueRowDrag = (options: {
  canDragReorder: boolean;
  itemCount: number;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onSetDragActive: (isActive: boolean) => void;
  resolveItemIndex: () => number;
}) => {
  const { canDragReorder, itemCount, onMoveItem, onSetDragActive } = options;
  const { resolveItemIndex } = options;
  const dragAnchorMoveYRef = useRef<number | null>(null);
  const measuredItemHeightRef = useRef(DEFAULT_ROW_HEIGHT);

  const panResponder = useMemo(() => {
    const endDrag = () => {
      onSetDragActive(false);
      dragAnchorMoveYRef.current = null;
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => canDragReorder,
      onStartShouldSetPanResponderCapture: () => canDragReorder,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          canDragReorder && Math.abs(gestureState.dy) > DRAG_START_DISTANCE
        );
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return (
          canDragReorder && Math.abs(gestureState.dy) > DRAG_START_DISTANCE
        );
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
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

        const stepDistance = Math.max(
          measuredItemHeightRef.current * DRAG_STEP_HEIGHT_RATIO,
          MIN_DRAG_STEP_DISTANCE,
        );
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
      onPanResponderRelease: endDrag,
      onPanResponderTerminate: endDrag,
    });
  }, [
    canDragReorder,
    itemCount,
    onMoveItem,
    onSetDragActive,
    resolveItemIndex,
  ]);

  return {
    onRowLayout: (measuredHeight: number) => {
      if (measuredHeight > 0) {
        measuredItemHeightRef.current = measuredHeight;
      }
    },
    panHandlers: panResponder.panHandlers,
  };
};
