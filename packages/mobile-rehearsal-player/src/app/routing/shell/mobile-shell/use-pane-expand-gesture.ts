import { useRef, useState } from 'react';

import {
  capturePointer,
  readPointer,
} from '../../../library/piano/components/piano-overlay/pointer-events';
import {
  dragLiftOffset,
  isDrag,
  shouldExpandOnDrag,
} from './pane-expand-model';

/**
 * Web pointer handlers for the Now Playing pane's backdrop: dragging up opens
 * the playback view (the way it slides in), and the pane's content lifts with
 * the finger meanwhile. `wasDragged` lets the click that follows a drag be
 * ignored, so a drag that does not open is not taken for a tap. The pane is a
 * web-only surface (the wide-short layout does not occur on native).
 */
export const usePaneExpandGesture = (onExpand: () => void) => {
  const [lift, setLift] = useState(0);
  const wasDragged = useRef(false);
  const start = useRef<{ id: number; x: number; y: number } | null>(null);

  const reset = () => {
    start.current = null;
    setLift(0);
  };

  const handlers = {
    onPointerCancel: reset,
    onPointerDown: (event: unknown) => {
      const sample = readPointer(event);

      capturePointer(event);
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

      wasDragged.current = wasDragged.current || isDrag(drag);
      setLift(dragLiftOffset(drag));
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

  return { handlers, lift, wasDragged };
};
