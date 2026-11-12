import { useRef } from 'react';
import { Animated } from 'react-native';

import {
  capturePointer,
  readPointer,
} from '../../../library/piano/components/piano-overlay/pointer-events';
import { useReduceMotion } from '../../playback/use-reduce-motion';
import {
  canStartPaneDrag,
  dragShiftOffset,
  isDrag,
  shouldExpandOnDrag,
} from './pane-expand-model';

const SPRING_BACK_DAMPING = 18;
const SPRING_BACK_STIFFNESS = 220;

/**
 * Web pointer handlers for the whole Now Playing pane (its controls included, since pointer events bubble): dragging it toward the centre of the window (leftward, as the pane is at
 * the trailing edge) opens the playback view, and the whole pane follows the
 * finger meanwhile (see `dragShiftOffset`). `wasDragged` lets the click that follows a drag be
 * ignored, so a drag that does not open is not taken for a tap. The pane is a
 * web-only surface (the wide-short layout does not occur on native).
 */
export const usePaneExpandGesture = (onExpand: () => void) => {
  // Driven directly on every move (no re-render per frame), and sprung back to
  // rest when the drag ends without opening.
  const shift = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();
  const wasDragged = useRef(false);
  const start = useRef<{ id: number; x: number; y: number } | null>(null);

  const reset = () => {
    start.current = null;

    if (reduceMotion) {
      shift.setValue(0);
      return;
    }

    Animated.spring(shift, {
      damping: SPRING_BACK_DAMPING,
      stiffness: SPRING_BACK_STIFFNESS,
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  const handlers = {
    // Bubbles from a child: a touch is first captured by the control it lands
    // on, and handing that capture to the pane (below) reports the control's
    // loss here. Only the pane losing the pointer itself ends the drag.
    onLostPointerCapture: (event: unknown) => {
      const { currentTarget, target } = event as {
        currentTarget?: unknown;
        target?: unknown;
      };

      if (target === currentTarget) {
        reset();
      }
    },
    onPointerCancel: reset,
    onPointerDown: (event: unknown) => {
      const sample = readPointer(event);

      if (!canStartPaneDrag(sample)) {
        return;
      }

      // Not captured yet: capturing at once would send the click that ends a
      // plain tap to the pane instead of the button under the finger.
      wasDragged.current = false;
      start.current = { id: sample.id, x: sample.clientX, y: sample.clientY };
    },
    onPointerMove: (event: unknown) => {
      const sample = readPointer(event);
      const origin = start.current;

      if (!origin || origin.id !== sample.id) {
        return;
      }

      const drag = {
        dx: sample.clientX - origin.x,
        dy: sample.clientY - origin.y,
      };

      if (!wasDragged.current && isDrag(drag)) {
        // From here on it is a drag: keep its events coming outside the pane.
        capturePointer(event);
        wasDragged.current = true;
      }

      // A new drag takes over from a spring still settling.
      shift.stopAnimation();
      shift.setValue(dragShiftOffset(drag));
    },
    onPointerUp: (event: unknown) => {
      const sample = readPointer(event);
      const origin = start.current;

      reset();

      if (
        origin &&
        origin.id === sample.id &&
        shouldExpandOnDrag({
          dx: sample.clientX - origin.x,
          dy: sample.clientY - origin.y,
        })
      ) {
        onExpand();
      }
    },
  };

  return { handlers, shift, wasDragged };
};
