import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import type { DomCanvas } from '../renderers/pdf-web-types';
import {
  ThumbnailCellFrame,
  type ThumbnailCellProps,
} from './thumbnail-cell-frame';
import type { ThumbnailQueue } from './thumbnail-queue';

// The canvas fits inside the picture area whatever the page's own shape.
const CANVAS_STYLE = 'display:block;width:100%;height:100%;object-fit:contain;';

type CanvasHost = {
  appendChild(child: unknown): unknown;
  ownerDocument: { createElement(tag: 'canvas'): DomCanvas };
};

/**
 * A page's thumbnail on the web: the frame holds one canvas, which the queue
 * draws into. Leaving the grid (or a new width) cancels and frees the draw.
 */
export const ThumbnailCell = (
  props: ThumbnailCellProps & { queue?: ThumbnailQueue },
) => {
  const { queue, ...frameProps } = props;
  const { cellWidth, index } = frameProps;
  const pictureRef = useRef<View>(null);

  useEffect(() => {
    const host = pictureRef.current as unknown as CanvasHost | null;

    if (!host || !queue) {
      return;
    }

    const canvas = host.ownerDocument.createElement('canvas');

    canvas.style.cssText = CANVAS_STYLE;
    host.appendChild(canvas);
    queue.enqueue(index, canvas, cellWidth);

    return () => {
      queue.discard(index);
    };
  }, [cellWidth, index, queue]);

  return (
    <ThumbnailCellFrame {...frameProps}>
      <View ref={pictureRef} style={{ flex: 1 }} />
    </ThumbnailCellFrame>
  );
};
