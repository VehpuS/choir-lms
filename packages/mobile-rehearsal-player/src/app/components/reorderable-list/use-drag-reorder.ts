import { useMemo, useRef } from 'react';
import { PanResponder } from 'react-native';

import {
  DEFAULT_ROW_HEIGHT,
  DRAG_START_DISTANCE,
  advanceDrag,
  resolveDragStepDistance,
} from './reorder-model';

export type DragReorderOptions = {
  canDrag: boolean;
  /** The item's current slot, read live because a move changes it mid-drag. */
  getIndex: () => number;
  /** Adds the scroll position when the list scrolls under the drag. */
  getScrollOffsetY?: () => number;
  /** Overrides the measured row height (a parent that measures for every row). */
  itemHeight?: number;
  itemCount: number;
  onActiveChange?: (isActive: boolean) => void;
  /** Called once when a drag that moved the item ends. */
  onCommit?: () => void;
  onDragMove?: (moveY: number) => void;
  onMove: (from: number, to: number) => void;
};

/**
 * Drag-to-reorder for one row: the handle's pan gesture moves the item one
 * slot each time it travels about a row's height. Shared by every reorderable
 * list so playlist detail, Up next, and settings lists behave alike.
 */
export const useDragReorder = (options: DragReorderOptions) => {
  const anchorRef = useRef<number | null>(null);
  const hasMovedRef = useRef(false);
  const measuredHeightRef = useRef(DEFAULT_ROW_HEIGHT);
  // One PanResponder for the row's life: it reads the latest options on every
  // event instead of being rebuilt, which could drop a drag in progress.
  const latest = useRef(options);

  latest.current = options;

  const panResponder = useMemo(() => {
    const reset = () => {
      anchorRef.current = null;
      hasMovedRef.current = false;
    };
    const shouldStart = (dy: number) => {
      return latest.current.canDrag && Math.abs(dy) > DRAG_START_DISTANCE;
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => latest.current.canDrag,
      onStartShouldSetPanResponderCapture: () => latest.current.canDrag,
      onMoveShouldSetPanResponder: (_, gesture) => shouldStart(gesture.dy),
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        shouldStart(gesture.dy),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        latest.current.onActiveChange?.(true);
        reset();
      },
      onPanResponderMove: (_, gesture) => {
        const current = latest.current;

        current.onDragMove?.(gesture.moveY);

        if (!current.canDrag) {
          return;
        }

        const y = gesture.moveY + (current.getScrollOffsetY?.() ?? 0);

        if (anchorRef.current === null) {
          anchorRef.current = y;
          return;
        }

        const result = advanceDrag({
          anchor: anchorRef.current,
          index: current.getIndex(),
          itemCount: current.itemCount,
          stepDistance: resolveDragStepDistance(
            current.itemHeight ?? measuredHeightRef.current,
          ),
          y,
        });

        anchorRef.current = result.anchor;

        for (const move of result.moves) {
          current.onMove(move.from, move.to);
          hasMovedRef.current = true;
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const current = latest.current;

        current.onActiveChange?.(false);
        current.onDragMove?.(gesture.moveY);

        if (hasMovedRef.current) {
          current.onCommit?.();
        }

        reset();
      },
      onPanResponderTerminate: () => {
        latest.current.onActiveChange?.(false);
        reset();
      },
    });
  }, []);

  return {
    onRowLayout: (measuredHeight: number) => {
      if (measuredHeight > 0) {
        measuredHeightRef.current = measuredHeight;
      }
    },
    panHandlers: panResponder.panHandlers,
  };
};
