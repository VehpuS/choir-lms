import { useEffect, useRef } from 'react';

import { appTheme } from '../../../utils/theme';
import { usePitchSettings } from '../../pitch/use-pitch';
import { useSungMidi } from '../../pitch/use-sung-midi';
import {
  buildMarkRules,
  getScoreMarks,
  type MarkPaint,
  type ScoreMarks,
} from '../renderers/score-pitch-marks';

// The app's TypeScript config carries no DOM library, so the slice of the DOM
// used here is described structurally.
type StyleElement = {
  remove(): void;
  setAttribute(name: string, value: string): void;
  textContent: string | null;
};
type MarkHost = {
  ownerDocument: {
    createElement(tag: 'style'): StyleElement;
    head: { appendChild(child: StyleElement): unknown };
  };
};

const STYLE_ATTRIBUTE = 'data-score-pitch-marks';
const { colors } = appTheme;
const STRONG_STROKE_WIDTH = 1.2;
/** The strong mark is a solid accent head with an outline; the soft one only a light tint. */
const PAINT: { exact: MarkPaint; soft: MarkPaint } = {
  exact: {
    fill: colors.accent,
    stroke: colors.accentRamp[700],
    strokeWidth: STRONG_STROKE_WIDTH,
  },
  soft: { fill: colors.accentRamp[200] },
};

/**
 * Marks the sung note on the drawn score with one style element: its text is
 * rewritten on each change of note (a constant number of DOM writes, however
 * long the score), and it keys on the `data-midi` tag every drawn notehead
 * carries, including the copies the strip renderer makes of a drawn run. The
 * element is removed when the viewer closes.
 */
const useScorePitchMarkStyle = (
  host: unknown,
  options: { isEnabled: boolean; marks: ScoreMarks },
) => {
  const style = useRef<StyleElement | null>(null);
  const markHost = host as MarkHost | null;

  useEffect(() => {
    if (!markHost || !options.isEnabled) {
      return undefined;
    }

    const element = markHost.ownerDocument.createElement('style');

    element.setAttribute(STYLE_ATTRIBUTE, '');
    markHost.ownerDocument.head.appendChild(element);
    style.current = element;

    return () => {
      element.remove();
      style.current = null;
    };
  }, [markHost, options.isEnabled]);

  const { exactMidi, otherOctaveMidis } = options.marks;

  useEffect(() => {
    if (style.current) {
      style.current.textContent = buildMarkRules(
        { exactMidi, otherOctaveMidis },
        PAINT,
      );
    }
  }, [exactMidi, otherOctaveMidis, markHost, options.isEnabled]);
};

/** The sung note marked on a score (never a PDF), following the track's pitch offset. */
export const useScorePitchMarks = (
  host: unknown,
  options: { isScore: boolean; pitchOffset: number },
) => {
  const { showOtherOctave } = usePitchSettings();

  useScorePitchMarkStyle(host, {
    isEnabled: options.isScore,
    marks: getScoreMarks({
      sungMidi: useSungMidi(),
      pitchOffset: options.pitchOffset,
      showOtherOctave,
    }),
  });
};
