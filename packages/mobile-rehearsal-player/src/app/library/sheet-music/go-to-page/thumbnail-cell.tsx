import {
  ThumbnailCellFrame,
  type ThumbnailCellProps,
} from './thumbnail-cell-frame';
import type { ThumbnailQueue } from './thumbnail-queue';

/**
 * Native has no PDF renderer yet (native-playback-follow-ups 1.6), so a cell
 * is its frame and page number; the web file draws the page. `queue` is
 * unused here and kept so both files take the same props.
 */
export const ThumbnailCell = ({
  cellWidth,
  index,
  isMarked,
  onPress,
}: ThumbnailCellProps & { queue?: ThumbnailQueue }) => (
  <ThumbnailCellFrame
    cellWidth={cellWidth}
    index={index}
    isMarked={isMarked}
    onPress={onPress}
  />
);
