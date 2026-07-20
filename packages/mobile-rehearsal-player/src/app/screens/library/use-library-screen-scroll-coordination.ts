import { useCallback, useRef, useState } from 'react';
import { ScrollView } from 'react-native';

import { resolveSavedPlaylistDetailEdgeAutoscrollDelta } from '../../library/playlists/utils/saved-playlist-detail-view-model';

type MeasurableScrollView = ScrollView & {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

export const useLibraryScreenScrollCoordination = () => {
  const [isPlaylistReorderDragActive, setIsPlaylistReorderDragActiveState] =
    useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const scrollOffsetYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportTopInWindowRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const refreshViewportBounds = useCallback(() => {
    const measurableScrollView =
      scrollViewRef.current as MeasurableScrollView | null;

    measurableScrollView?.measureInWindow((_x, y, _width, height) => {
      viewportTopInWindowRef.current = y;
      viewportHeightRef.current = height;
    });
  }, []);
  const setPlaylistReorderDragActive = useCallback(
    (isActive: boolean) => {
      if (isActive) {
        refreshViewportBounds();
      }

      setIsPlaylistReorderDragActiveState(isActive);
    },
    [refreshViewportBounds],
  );
  const setPlaylistReorderDragMoveY = useCallback(
    (moveY: number) => {
      if (!isPlaylistReorderDragActive) {
        return;
      }

      const viewportHeight = viewportHeightRef.current;
      const moveYWithinViewport = moveY - viewportTopInWindowRef.current;

      if (viewportHeight <= 0) {
        return;
      }

      const scrollDelta = resolveSavedPlaylistDetailEdgeAutoscrollDelta({
        moveY: moveYWithinViewport,
        viewportHeight,
      });

      if (scrollDelta === 0) {
        return;
      }

      const maxOffset = Math.max(contentHeightRef.current - viewportHeight, 0);
      const nextOffset = Math.max(
        0,
        Math.min(scrollOffsetYRef.current + scrollDelta, maxOffset),
      );

      if (nextOffset === scrollOffsetYRef.current) {
        return;
      }

      scrollOffsetYRef.current = nextOffset;
      scrollViewRef.current?.scrollTo({
        y: nextOffset,
        animated: false,
      });
    },
    [isPlaylistReorderDragActive],
  );

  return {
    getCurrentScrollOffsetY() {
      return scrollOffsetYRef.current;
    },
    handleContentSizeChange(_width: number, contentHeight: number) {
      contentHeightRef.current = contentHeight;
    },
    handleLayout(event: { nativeEvent: { layout: { height: number } } }) {
      viewportHeightRef.current = event.nativeEvent.layout.height;
      refreshViewportBounds();
    },
    handleScroll(event: { nativeEvent: { contentOffset: { y: number } } }) {
      scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
    },
    isPlaylistReorderDragActive,
    scrollViewRef,
    setPlaylistReorderDragActive,
    setPlaylistReorderDragMoveY,
  };
};
