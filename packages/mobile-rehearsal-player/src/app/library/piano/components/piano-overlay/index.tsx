import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { appTheme } from '../../../../utils/theme';
import {
  centredScrollOffset,
  middleCScrollOffset,
  PIANO_KEY_HEIGHTS,
} from '../../keyboard-layout';
import { pianoCapabilities } from '../../piano-capabilities';
import { clampScrollLeft } from '../../piano-overlay-model';
import {
  setPianoPreferences,
  setPianoScrollLeft,
  usePianoPreferences,
} from '../../piano-preferences';
import { usePianoSound } from '../../use-piano-sound';
import { PianoKeyboard } from './piano-keyboard';
import { PianoOverlayHeader } from './piano-overlay-header';
import { PianoScrollStrip } from './piano-scroll-strip';

const { colors } = appTheme;

export type PianoNoteRange = { lowest: number; highest: number };

type PianoOverlayProps = {
  /**
   * A note range to centre on when the overlay opens (the shown part's range
   * in the sheet music viewer). Without one, a device with no remembered
   * position opens on middle C.
   */
  focusRange?: PianoNoteRange | null;
};

type PianoOverlayBodyProps = PianoOverlayProps;

// Mounted once per opening, so the opening position is chosen once per
// opening and never while the user is scrolling.
const PianoOverlayBody = ({ focusRange }: PianoOverlayBodyProps) => {
  const preferences = usePianoPreferences();
  const sound = usePianoSound();
  const [viewportWidth, setViewportWidth] = useState(0);
  const keyHeight = PIANO_KEY_HEIGHTS[preferences.heightStep];
  // What the opening position was based on, and whether the user has scrolled
  // since: a score's range can arrive after the piano opens, and it replaces
  // the middle C default only if nobody has scrolled yet.
  const placed = useRef<'none' | 'default' | 'range'>('none');
  const hasUserScrolled = useRef(false);
  const lowest = focusRange?.lowest;
  const highest = focusRange?.highest;

  useEffect(() => {
    // Opening is a user gesture, the moment browsers allow audio to start.
    sound.prime();
  }, []);

  useEffect(() => {
    if (
      viewportWidth === 0 ||
      preferences.isCollapsed ||
      hasUserScrolled.current
    ) {
      return;
    }

    if (lowest !== undefined && highest !== undefined) {
      if (placed.current !== 'range') {
        placed.current = 'range';
        setPianoScrollLeft(
          centredScrollOffset({ lowest, highest }, viewportWidth),
        );
      }
    } else if (placed.current === 'none') {
      placed.current = 'default';

      if (preferences.scrollLeft === 0) {
        setPianoScrollLeft(middleCScrollOffset(viewportWidth));
      }
    }
  }, [
    highest,
    lowest,
    preferences.isCollapsed,
    preferences.scrollLeft,
    viewportWidth,
  ]);

  const scrollByUser = (next: number) => {
    hasUserScrolled.current = true;
    setPianoScrollLeft(next);
  };

  const scrollLeft = clampScrollLeft(preferences.scrollLeft, viewportWidth);

  return (
    <View style={styles.overlay} testID="piano-overlay">
      <PianoOverlayHeader
        heightStep={preferences.heightStep}
        isCollapsed={preferences.isCollapsed}
        onChangeHeightStep={(heightStep) => {
          setPianoPreferences({ heightStep });
        }}
        onChangeVolume={(volume) => {
          setPianoPreferences({ volume });
        }}
        onClose={() => {
          setPianoPreferences({ isOpen: false });
        }}
        onToggleCollapsed={() => {
          setPianoPreferences({ isCollapsed: !preferences.isCollapsed });
        }}
        volume={preferences.volume}
      />
      {preferences.isCollapsed ? null : (
        <>
          <PianoKeyboard
            keyHeight={keyHeight}
            labelOptions={preferences}
            onPress={sound.press}
            onRelease={sound.release}
            onScrollLeftChange={scrollByUser}
            onViewportWidthChange={setViewportWidth}
            scrollLeft={scrollLeft}
            sounding={sound.sounding}
          />
          <PianoScrollStrip
            onScrollLeftChange={scrollByUser}
            scrollLeft={scrollLeft}
            viewportWidth={viewportWidth}
          />
        </>
      )}
    </View>
  );
};

/** The piano dock. Renders nothing where the platform cannot play it. */
export const PianoOverlay = (props: PianoOverlayProps) => {
  const { isOpen } = usePianoPreferences();

  if (!pianoCapabilities().canPlay || !isOpen) {
    return null;
  }

  return <PianoOverlayBody {...props} />;
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: colors.surfaceRaised,
    borderTopColor: colors.borderSubtle,
    borderTopWidth: 1,
  },
});
