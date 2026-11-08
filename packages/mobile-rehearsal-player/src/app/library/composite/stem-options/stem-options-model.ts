import {
  MIN_COMPOSITE_STEMS,
  type CompositeStem,
  type CompositeTrack,
} from '@org/audio-library-models';

import { formatDurationLabel } from '../../drive/utils/drive-library-metadata';

/**
 * The stem options sheet's content (composite-tracks design Decision 3 and the
 * `This is my part` requirement): the stem's name, whether it is the user's
 * part, its offset with the steppers that change it, and removal. Pure; the
 * sheet view and the store calls sit around it.
 */

export const MAX_STEM_OFFSET_MS = 30_000;
export const OFFSET_STEP_DELTAS_MS = [-100, -10, 10, 100] as const;

const MINUS_SIGN = '−';

export const STEM_OPTIONS_COPY = {
  nameLabel: 'Stem name',
  mineLabel: 'This is my part',
  mineHint: 'Used by the "Without my part" presets',
  offsetLabel: 'Offset',
  offsetHint:
    'Shifts this stem later, or earlier with a negative value. Use it when a stem was exported with a lead-in.',
  removeLabel: 'Remove this stem',
  showOriginalLabel: 'Show original track',
  doneLabel: 'Done',
  deleteQuestion:
    'A composite needs at least two stems. Removing this one deletes the composite. The tracks stay in your library.',
  deleteLabel: 'Delete composite',
  keepLabel: 'Keep composite',
} as const;

export type OffsetStep = {
  deltaMs: number;
  label: string;
  /** True when the step would not move the offset (it is at the limit). */
  disabled: boolean;
};

export type StemOptionsModel = {
  stemId: string;
  trackId: string;
  title: string;
  subtitle: string;
  name: string;
  mine: boolean;
  offsetMs: number;
  offsetLabel: string;
  steps: OffsetStep[];
  /** True when removing this stem would leave fewer than two. */
  removeAsksToDelete: boolean;
};

/** `+0 ms`, `+250 ms`, `−100 ms`: always signed, with a true minus sign. */
export const formatOffsetLabel = (offsetMs: number): string =>
  `${offsetMs < 0 ? MINUS_SIGN : '+'}${Math.abs(offsetMs)} ms`;

export const stepOffsetMs = (offsetMs: number, deltaMs: number): number =>
  Math.min(
    MAX_STEM_OFFSET_MS,
    Math.max(-MAX_STEM_OFFSET_MS, offsetMs + deltaMs),
  );

const formatStepLabel = (deltaMs: number): string =>
  `${deltaMs < 0 ? MINUS_SIGN : '+'}${Math.abs(deltaMs)}`;

const findStem = (
  composite: CompositeTrack,
  stemId: string,
): CompositeStem | undefined =>
  composite.stems.find((stem) => stem.id === stemId);

export const resolveStemOptionsModel = (input: {
  composite: CompositeTrack;
  stemId: string;
  /** The stem's library track, when it is still there. */
  track?: { name: string; durationMs?: number };
}): StemOptionsModel | null => {
  const stem = findStem(input.composite, input.stemId);

  if (!stem) {
    return null;
  }

  const duration = formatDurationLabel(input.track?.durationMs);
  const subtitleParts = [input.track?.name, duration].filter(
    (part): part is string => Boolean(part),
  );

  return {
    stemId: stem.id,
    trackId: stem.trackId,
    title: stem.name,
    subtitle: subtitleParts.join(' · '),
    name: stem.name,
    mine: stem.mine,
    offsetMs: stem.offsetMs,
    offsetLabel: formatOffsetLabel(stem.offsetMs),
    steps: OFFSET_STEP_DELTAS_MS.map((deltaMs) => ({
      deltaMs,
      label: formatStepLabel(deltaMs),
      disabled: stepOffsetMs(stem.offsetMs, deltaMs) === stem.offsetMs,
    })),
    removeAsksToDelete: input.composite.stems.length <= MIN_COMPOSITE_STEMS,
  };
};
