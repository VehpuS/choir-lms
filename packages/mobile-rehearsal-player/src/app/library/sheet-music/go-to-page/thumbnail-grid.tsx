import { chunk } from 'es-toolkit';
import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { darkScrollbarStyle } from '../../../components/dark-scrollbar';
import { appTheme } from '../../../utils/theme';
import {
  THUMBNAIL_GAP,
  thumbnailGrid,
  thumbnailRowHeight,
  visibleRows,
} from './go-to-page-model';
import { ThumbnailCell } from './thumbnail-cell';
import type { ThumbnailQueue } from './thumbnail-queue';

// Rows kept mounted (and drawn) above and below the ones in view.
const ROW_MARGIN = 1;
const GRID_PADDING = appTheme.space.xxs;
const MIN_GRID_HEIGHT = 220;

type ThumbnailGridProps = {
  currentPage: number;
  marked: readonly number[];
  onChoose: (page: number) => void;
  pageCount: number;
  queue?: ThumbnailQueue;
};

type Size = { height: number; width: number };

/**
 * The page grid. Only the rows in view plus a margin are mounted, each between
 * spacers that keep the scroll length right, so a cell exists (and draws its
 * thumbnail) only while it is near the viewport.
 */
export const ThumbnailGrid = ({
  currentPage,
  marked,
  onChoose,
  pageCount,
  queue,
}: ThumbnailGridProps) => {
  const scrollRef = useRef<ScrollView>(null);
  const placedKey = useRef<string | undefined>(undefined);
  const placedTop = useRef(0);
  const [size, setSize] = useState<Size>();
  const [scrollTop, setScrollTop] = useState(0);
  const grid =
    size && size.width > 0 && size.height > 0
      ? thumbnailGrid(size.width)
      : undefined;
  const rowHeight = grid ? thumbnailRowHeight(grid.cellWidth) : 0;

  // Bring the current page's row to the middle when the grid is first measured,
  // and again if its size then changes (a scrollbar appearing narrows the
  // cells) before the reader has scrolled.
  useEffect(() => {
    if (!grid || !size) {
      return;
    }

    const key = `${grid.columns}x${grid.cellWidth}`;
    const hasMoved = Math.abs(scrollTop - placedTop.current) >= 1;

    if (placedKey.current === key || (placedKey.current && hasMoved)) {
      return;
    }

    const row = Math.floor(currentPage / grid.columns);
    const top = Math.max(0, row * rowHeight - (size.height - rowHeight) / 2);

    placedKey.current = key;
    placedTop.current = top;
    scrollRef.current?.scrollTo({ animated: false, y: top });
    setScrollTop(top);
  }, [currentPage, grid, rowHeight, scrollTop, size]);

  // The marked page draws first; cells add themselves before this runs.
  useEffect(() => {
    [...marked].reverse().forEach((page) => queue?.prioritize(page));
  }, [marked, queue, scrollTop]);

  // The height is the viewport's; the width is the content's, which a
  // scrollbar that takes room (a mouse) makes narrower than the viewport.
  const onViewportLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;

    setSize((current) => ({ height, width: current?.width ?? 0 }));
  };
  const onContentLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;

    setSize((current) => ({ height: current?.height ?? 0, width }));
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollTop(event.nativeEvent.contentOffset.y);
  };

  const pages =
    grid && size
      ? visibleRows({
          columns: grid.columns,
          margin: ROW_MARGIN,
          pageCount,
          rowHeight,
          scrollTop,
          viewportHeight: size.height,
        })
      : [];
  const firstRow = grid ? Math.floor((pages[0] ?? 0) / grid.columns) : 0;
  const lastRow = grid
    ? Math.floor((pages[pages.length - 1] ?? 0) / grid.columns)
    : 0;
  const rowCount = grid ? Math.ceil(pageCount / grid.columns) : 0;
  const markedPages = new Set(marked);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onLayout={onViewportLayout}
      onScroll={onScroll}
      ref={scrollRef}
      scrollEventThrottle={16}
      style={[darkScrollbarStyle, styles.scroll]}
    >
      <View onLayout={onContentLayout}>
        {grid ? (
          <>
            <View style={{ height: firstRow * rowHeight }} />
            {chunk(pages, grid.columns).map((row) => (
              <View key={row[0]} style={[styles.row, { height: rowHeight }]}>
                {row.map((page) => (
                  <ThumbnailCell
                    cellWidth={grid.cellWidth}
                    index={page}
                    isMarked={markedPages.has(page)}
                    key={page}
                    onPress={onChoose}
                    queue={queue}
                  />
                ))}
              </View>
            ))}
            <View style={{ height: (rowCount - 1 - lastRow) * rowHeight }} />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: GRID_PADDING,
  },
  row: {
    flexDirection: 'row',
    gap: THUMBNAIL_GAP,
    alignSelf: 'center',
  },
  // Shrinks under the sheet's height cap; a few rows always stay in view.
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: MIN_GRID_HEIGHT,
  },
});
