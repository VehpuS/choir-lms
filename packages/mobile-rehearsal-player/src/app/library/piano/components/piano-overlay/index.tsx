import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { appTheme } from '../../../../utils/theme';
import {
  centredScrollOffset,
  createKeyboardLayout,
  middleCScrollOffset,
  rescaledScrollOffset,
} from '../../keyboard-layout';
import { pianoCapabilities } from '../../piano-capabilities';
import type { PianoHeightStep } from '../../keyboard-layout';
import {
  capHeightStep,
  clampScrollLeft,
  pianoKeyHeightFor,
  type PianoPresentation,
} from '../../piano-overlay-model';
import {
  setPianoPreferences,
  setPianoScrollLeft,
  usePianoPreferences,
} from '../../piano-preferences';
import { useComputerKeyboardPiano } from '../../use-computer-keyboard-piano';
import { usePianoSound } from '../../use-piano-sound';
import { PianoKeyboard } from './piano-keyboard';
import { getDetectedKeys } from '../../piano-detected-model';
import { useSungMidi } from '../../../pitch/use-sung-midi';
import { PianoCompactBar } from './piano-compact-bar';
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
  /**
   * The tallest step to draw, whatever is stored. The viewer on a short
   * landscape window caps it at `compact` so the score keeps its height.
   */
  heightLimit?: PianoHeightStep;
  /**
   * `docked` (the default) is the upright piano; `compact-bar` is the
   * wide-short layout's slim bar over a fixed-height keyboard.
   */
  presentation?: PianoPresentation;
};

type PianoOverlayBodyProps = PianoOverlayProps;

// Mounted once per opening, so the opening position is chosen once per
// opening and never while the user is scrolling.
const PianoOverlayBody = ({
  focusRange,
  heightLimit,
  presentation = 'docked',
}: PianoOverlayBodyProps) => {
  const preferences = usePianoPreferences();
  const sound = usePianoSound();

  useComputerKeyboardPiano(sound.press, sound.release);
  const [viewportWidth, setViewportWidth] = useState(0);
  const heightStep = capHeightStep(preferences.heightStep, heightLimit);
  const keyHeight = pianoKeyHeightFor(presentation, heightStep);
  const layout = useMemo(
    () => createKeyboardLayout(preferences.keyWidth),
    [preferences.keyWidth],
  );
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
    if (viewportWidth === 0 || hasUserScrolled.current) {
      return;
    }

    if (lowest !== undefined && highest !== undefined) {
      if (placed.current !== 'range') {
        placed.current = 'range';
        setPianoScrollLeft(
          centredScrollOffset({ lowest, highest }, viewportWidth, layout),
        );
      }
    } else if (placed.current === 'none') {
      placed.current = 'default';

      if (preferences.scrollLeft === 0) {
        setPianoScrollLeft(middleCScrollOffset(viewportWidth, layout));
      }
    }
  }, [highest, lowest, preferences.scrollLeft, viewportWidth]);

  const scrollByUser = (next: number) => {
    hasUserScrolled.current = true;
    setPianoScrollLeft(next);
  };

  const scrollLeft = clampScrollLeft(
    preferences.scrollLeft,
    viewportWidth,
    layout.stripWidth,
  );

  // The key at the centre of the view stays there as the keys widen or narrow.
  const changeKeyWidth = (keyWidth: number) => {
    const next = createKeyboardLayout(keyWidth);

    setPianoPreferences({ keyWidth: next.whiteKeyWidth });
    setPianoScrollLeft(
      rescaledScrollOffset({
        from: layout,
        scrollLeft,
        to: next,
        viewportWidth,
      }),
    );
  };

  const isCompactBar = presentation === 'compact-bar';
  const changeVolume = (volume: number) => {
    setPianoPreferences({ volume });
  };
  const closePiano = () => {
    setPianoPreferences({ isOpen: false });
  };

  const detected = getDetectedKeys({
    sungMidi: useSungMidi(),
    layout,
    scrollLeft,
    viewportWidth,
  });

  return (
    <View style={styles.overlay} testID="piano-overlay">
      {isCompactBar ? (
        <PianoCompactBar
          keyWidth={preferences.keyWidth}
          onChangeKeyWidth={changeKeyWidth}
          onChangeVolume={changeVolume}
          onClose={closePiano}
          onScrollLeftChange={scrollByUser}
          scrollLeft={scrollLeft}
          stripWidth={layout.stripWidth}
          viewportWidth={viewportWidth}
          volume={preferences.volume}
        />
      ) : (
        <PianoOverlayHeader
          heightStep={heightStep}
          keyWidth={preferences.keyWidth}
          onChangeHeightStep={(heightStep) => {
            setPianoPreferences({ heightStep });
          }}
          onChangeKeyWidth={changeKeyWidth}
          onChangeVolume={changeVolume}
          onClose={closePiano}
          volume={preferences.volume}
        />
      )}
      <PianoKeyboard
        detectedEdge={detected.edge}
        detectedMidi={detected.midi}
        keyHeight={keyHeight}
        labelOptions={preferences}
        layout={layout}
        onPress={sound.press}
        onRelease={sound.release}
        onScrollLeftChange={scrollByUser}
        onViewportWidthChange={setViewportWidth}
        scrollLeft={scrollLeft}
        sounding={sound.sounding}
      />
      {isCompactBar ? null : (
        <PianoScrollStrip
          onScrollLeftChange={scrollByUser}
          scrollLeft={scrollLeft}
          stripWidth={layout.stripWidth}
          viewportWidth={viewportWidth}
        />
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
