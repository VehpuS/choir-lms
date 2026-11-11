import { useRef } from 'react';

import {
  capturePointer,
  readPointer,
} from '../../piano/components/piano-overlay/pointer-events';
import {
  dragCardOffset,
  isTapMovement,
  type CardOffset,
} from './card-position-model';

type Size = { height: number; width: number };

type CardDragOptions = {
  card: () => Size;
  container: () => Size;
  offset: CardOffset;
  onMove: (offset: CardOffset) => void;
};

/**
 * Web pointer handlers that drag the card by its header or pill. The card is a
 * web-only surface (the wide-short layout does not occur on native), so these
 * are pointer events like the piano's drag handle. The press captures the
 * pointer so the drag keeps going outside the handle.
 */
export const useCardDrag = ({
  card,
  container,
  offset,
  onMove,
}: CardDragOptions) => {
  // The browser follows a captured drag with a click on the handle; whoever
  // handles that click asks this first, so a drag never counts as a press.
  const wasDragged = useRef(false);
  const drag = useRef<{
    id: number;
    startOffset: CardOffset;
    startX: number;
    startY: number;
    totalX: number;
    totalY: number;
  } | null>(null);

  const handlers = {
    onPointerCancel: () => {
      drag.current = null;
    },
    onPointerDown: (event: unknown) => {
      const sample = readPointer(event);

      capturePointer(event);
      wasDragged.current = false;
      drag.current = {
        id: sample.id,
        startOffset: offset,
        startX: sample.clientX,
        startY: sample.clientY,
        totalX: 0,
        totalY: 0,
      };
    },
    onPointerMove: (event: unknown) => {
      const sample = readPointer(event);
      const active = drag.current;

      if (!active || active.id !== sample.id) {
        return;
      }

      active.totalX = sample.clientX - active.startX;
      active.totalY = sample.clientY - active.startY;
      wasDragged.current = !isTapMovement({
        x: active.totalX,
        y: active.totalY,
      });
      onMove(
        dragCardOffset(
          active.startOffset,
          { x: active.totalX, y: active.totalY },
          card(),
          container(),
        ),
      );
    },
    onPointerUp: () => {
      drag.current = null;
    },
  };

  return { handlers, wasDragged };
};
