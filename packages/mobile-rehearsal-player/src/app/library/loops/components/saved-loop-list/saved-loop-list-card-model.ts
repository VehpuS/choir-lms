import {
  formatTransformLabel,
  type NamedLoop,
} from '@org/audio-library-models';

import {
  formatSavedLoopBoundaryLabel,
  formatSavedLoopLengthLabel,
  formatSavedLoopTimeRange,
} from '../../utils/saved-loop-view-model';

/** `active` is the expanded card of the active loop; `idle` is outline-only. */
export type SavedLoopCardTone = 'active' | 'idle';

export type SavedLoopCardFooter = {
  endLabel: string;
  lengthLabel: string;
  startLabel: string;
};

export type SavedLoopCardPresentation = {
  footer: SavedLoopCardFooter | null;
  lengthLabel: string;
  rangeLabel: string;
  ringAccessibilityLabel: string;
  ringIconName: 'pause' | 'play';
  /** An adjusted loop's `0.90× −2 st`, shown between its range and its source. */
  transformLabel: string | null;
  tone: SavedLoopCardTone;
};

const PAUSE_ACTION_LABEL = 'Pause';

/**
 * How a saved loop card reads (screen 1d): every card shows its range and
 * length; the active loop (playing or paused) expands with a waveform
 * excerpt over a start / length / end footer. The ring mirrors the row's
 * playback action, so it shows `pause` only while that loop plays.
 */
export const resolveSavedLoopCardPresentation = (options: {
  isActive: boolean;
  loop: Pick<NamedLoop, 'endMs' | 'name' | 'startMs' | 'transform'>;
  playbackActionLabel: string;
}): SavedLoopCardPresentation => {
  const lengthLabel = formatSavedLoopLengthLabel(options.loop);

  return {
    footer: options.isActive
      ? {
          endLabel: formatSavedLoopBoundaryLabel(options.loop.endMs),
          lengthLabel,
          startLabel: formatSavedLoopBoundaryLabel(options.loop.startMs),
        }
      : null,
    lengthLabel,
    rangeLabel: formatSavedLoopTimeRange(options.loop),
    ringAccessibilityLabel: `${options.playbackActionLabel} ${options.loop.name}`,
    ringIconName:
      options.playbackActionLabel === PAUSE_ACTION_LABEL ? 'pause' : 'play',
    transformLabel: options.loop.transform
      ? formatTransformLabel(options.loop.transform)
      : null,
    tone: options.isActive ? 'active' : 'idle',
  };
};
