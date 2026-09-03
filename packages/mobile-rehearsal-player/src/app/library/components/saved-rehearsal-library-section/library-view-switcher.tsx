import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  SAVED_REHEARSAL_LIBRARY_VIEW_OPTIONS,
  type SavedRehearsalLibraryView,
} from '../../saved-rehearsal-library/detail-mode';
import { InteractionChip } from '../interaction-chip';
import { SAVED_LIBRARY_SECTION_BACKGROUND } from './styles';
import { resolveHorizontalScrollEdgeFades } from './view-switcher-overflow-model';

// Fades to the pill row's own card background, hinting that the row
// scrolls horizontally to reveal more views (e.g. "Tags") without adding a
// gradient-rendering dependency for this one minimal affordance. Ordered
// from the strip nearest the content (most transparent) to the strip at the
// true trailing edge (fully opaque); the leading fade uses the same stops
// mirrored, since it's anchored to the opposite side of the row.
const VIEW_SWITCHER_FADE_OPACITIES = [0.15, 0.4, 0.75, 0.95, 1] as const;
const VIEW_SWITCHER_FADE_OPACITIES_LEADING = [
  ...VIEW_SWITCHER_FADE_OPACITIES,
].reverse();
const VIEW_SWITCHER_FADE_STRIP_WIDTH = 8;

type LibraryViewSwitcherProps = {
  isViewSwitcherLocked: boolean;
  onSelectView: (view: SavedRehearsalLibraryView) => void;
  selectedView: SavedRehearsalLibraryView;
};

export const SavedRehearsalLibraryViewSwitcher = ({
  isViewSwitcherLocked,
  onSelectView,
  selectedView,
}: LibraryViewSwitcherProps) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const edgeFades = resolveHorizontalScrollEdgeFades({
    containerWidth,
    contentWidth,
    scrollX,
  });

  return (
    <View style={styles.viewRowWrapper}>
      <ScrollView
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
        style={styles.viewRow}
      >
        {SAVED_REHEARSAL_LIBRARY_VIEW_OPTIONS.map((option) => {
          return (
            <InteractionChip
              key={option.value}
              accessibilityLabel={`Show ${option.label} library view`}
              disabled={isViewSwitcherLocked}
              label={option.label}
              onPress={() => {
                onSelectView(option.value);
              }}
              style={styles.viewChip}
              variant={selectedView === option.value ? 'selected' : 'passive'}
            />
          );
        })}
      </ScrollView>
      {edgeFades.showLeadingFade ? (
        <View
          pointerEvents="none"
          style={[styles.viewRowFade, styles.viewRowFadeLeading]}
        >
          {VIEW_SWITCHER_FADE_OPACITIES_LEADING.map((opacity) => {
            return (
              <View
                key={opacity}
                style={[
                  styles.viewRowFadeStrip,
                  { opacity, width: VIEW_SWITCHER_FADE_STRIP_WIDTH },
                ]}
              />
            );
          })}
        </View>
      ) : null}
      {edgeFades.showTrailingFade ? (
        <View
          pointerEvents="none"
          style={[styles.viewRowFade, styles.viewRowFadeTrailing]}
        >
          {VIEW_SWITCHER_FADE_OPACITIES.map((opacity) => {
            return (
              <View
                key={opacity}
                style={[
                  styles.viewRowFadeStrip,
                  { opacity, width: VIEW_SWITCHER_FADE_STRIP_WIDTH },
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  viewChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewRow: {
    maxHeight: 48,
  },
  viewRowContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  viewRowWrapper: {
    position: 'relative',
  },
  viewRowFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  viewRowFadeLeading: {
    left: 0,
  },
  viewRowFadeTrailing: {
    right: 0,
  },
  viewRowFadeStrip: {
    height: '100%',
    backgroundColor: SAVED_LIBRARY_SECTION_BACKGROUND,
  },
});
