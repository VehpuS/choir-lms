import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { appTheme } from '../../../utils/theme';
import {
  SAVED_REHEARSAL_LIBRARY_VIEW_OPTIONS,
  type SavedRehearsalLibraryView,
} from '../../saved-rehearsal-library/detail-mode';
import { InteractionChip } from '../interaction-chip';
import {
  resolveEdgeFadeStops,
  resolveHorizontalScrollEdgeFades,
  resolveScrollXToRevealChip,
  VIEW_SWITCHER_EDGE_FADE_COLOR,
  VIEW_SWITCHER_EDGE_FADE_WIDTH,
  type HorizontalScrollEdge,
} from './view-switcher-overflow-model';

type LibraryViewSwitcherProps = {
  isViewSwitcherLocked: boolean;
  onSelectView: (view: SavedRehearsalLibraryView) => void;
  selectedView: SavedRehearsalLibraryView;
};

// Scroll affordance: hints that the row scrolls to reveal more views (e.g.
// "Tags") by fading the chips into the ground at whichever edge still has
// content beyond it.
const ViewRowEdgeFade = ({ edge }: { edge: HorizontalScrollEdge }) => {
  const gradientId = `library-view-switcher-fade-${edge}`;
  const [start, end] = resolveEdgeFadeStops(edge);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.viewRowFade,
        edge === 'leading'
          ? styles.viewRowFadeLeading
          : styles.viewRowFadeTrailing,
      ]}
    >
      <Svg height="100%" width={VIEW_SWITCHER_EDGE_FADE_WIDTH}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <Stop
              offset={start.offset}
              stopColor={VIEW_SWITCHER_EDGE_FADE_COLOR}
              stopOpacity={start.opacity}
            />
            <Stop
              offset={end.offset}
              stopColor={VIEW_SWITCHER_EDGE_FADE_COLOR}
              stopOpacity={end.opacity}
            />
          </LinearGradient>
        </Defs>
        <Rect
          fill={`url(#${gradientId})`}
          height="100%"
          width={VIEW_SWITCHER_EDGE_FADE_WIDTH}
        />
      </Svg>
    </View>
  );
};

export const SavedRehearsalLibraryViewSwitcher = ({
  isViewSwitcherLocked,
  onSelectView,
  selectedView,
}: LibraryViewSwitcherProps) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const chipLayoutsRef = useRef(
    new Map<string, { width: number; x: number }>(),
  );
  const edgeFades = resolveHorizontalScrollEdgeFades({
    containerWidth,
    contentWidth,
    scrollX,
  });

  // The row never moved on its own, so a view chosen from elsewhere (Recents'
  // `See all`) or at the overflowing end could sit half under the edge fade.
  useEffect(() => {
    const chip = chipLayoutsRef.current.get(selectedView);

    if (!chip) {
      return;
    }

    const nextScrollX = resolveScrollXToRevealChip({
      chipWidth: chip.width,
      chipX: chip.x,
      containerWidth,
      contentWidth,
      scrollX,
    });

    if (nextScrollX !== null) {
      scrollViewRef.current?.scrollTo({ animated: true, x: nextScrollX });
    }
    // Only a different selection or a re-measured row should move the row; the
    // user's own scrolling (`scrollX`) must not be fought.
  }, [selectedView, containerWidth, contentWidth]);

  return (
    <View style={styles.viewRowWrapper}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.viewRowContent}
        horizontal
        onContentSizeChange={(width) => {
          setContentWidth(width);
        }}
        onLayout={(event) => {
          setContainerWidth(event.nativeEvent.layout.width);
        }}
        onScroll={(event) => {
          setScrollX(event.nativeEvent.contentOffset.x);
        }}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
      >
        {SAVED_REHEARSAL_LIBRARY_VIEW_OPTIONS.map((option) => {
          return (
            <View
              key={option.value}
              onLayout={(event) => {
                const { width, x } = event.nativeEvent.layout;

                chipLayoutsRef.current.set(option.value, { width, x });
              }}
            >
              <InteractionChip
                accessibilityLabel={`Show ${option.label} library view`}
                disabled={isViewSwitcherLocked}
                label={option.label}
                onPress={() => {
                  onSelectView(option.value);
                }}
                variant={selectedView === option.value ? 'selected' : 'passive'}
              />
            </View>
          );
        })}
      </ScrollView>
      {edgeFades.showLeadingFade ? <ViewRowEdgeFade edge="leading" /> : null}
      {edgeFades.showTrailingFade ? <ViewRowEdgeFade edge="trailing" /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  viewRowContent: {
    flexDirection: 'row',
    gap: appTheme.space.sm,
  },
  viewRowWrapper: {
    position: 'relative',
  },
  viewRowFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: VIEW_SWITCHER_EDGE_FADE_WIDTH,
  },
  viewRowFadeLeading: {
    left: 0,
  },
  viewRowFadeTrailing: {
    right: 0,
  },
});
