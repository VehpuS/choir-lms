import {
  centsZone,
  midiToNoteName,
  NEAR_CENTS,
  PRECISE_CENTS,
  MATCH_TOLERANCE_CENTS,
  type CentsZone,
} from '@org/audio-library-models';
import type { PitchReading } from '@org/pitch-detection';

import type { PitchHistorySnapshot } from './pitch-history';

const MS_PER_SECOND = 1000;
const CENTS_PER_SEMITONE = 100;

/** Plain words for each zone: the zone is always also text, never only colour. */
export const ZONE_LABELS: Record<CentsZone, string> = {
  precise: 'Precise',
  near: 'Near',
  'quarter-tone-off': 'Quarter tone off',
  'off-pitch': 'Off pitch',
};

/** The three bands the focus panel draws, innermost first. */
export const FOCUS_BANDS: readonly {
  zone: Exclude<CentsZone, 'off-pitch'>;
  label: string;
  limitCents: number;
}[] = [
  { zone: 'precise', label: ZONE_LABELS.precise, limitCents: PRECISE_CENTS },
  { zone: 'near', label: ZONE_LABELS.near, limitCents: NEAR_CENTS },
  {
    zone: 'quarter-tone-off',
    label: ZONE_LABELS['quarter-tone-off'],
    limitCents: MATCH_TOLERANCE_CENTS,
  },
];

/** The panel's vertical extent in cents either side of the target. */
export const FOCUS_RANGE_CENTS = MATCH_TOLERANCE_CENTS;

export type FocusTarget = {
  /** Null until something is sung and no note is held. */
  midi: number | null;
  name: string | null;
  isHeld: boolean;
};

/** The held note, else the nearest note of what is being sung. */
export const resolveTarget = (
  heldMidi: number | null,
  reading: PitchReading,
): FocusTarget => {
  const midi = heldMidi ?? (reading.active ? reading.midi : null);

  return {
    midi,
    name: midi === null ? null : midiToNoteName(midi),
    isHeld: heldMidi !== null,
  };
};

export type FocusPoint = {
  /** 0 at the left edge of the window, 1 at the leading edge. */
  x: number;
  /** Cents from the target, clamped to the panel (±50). */
  cents: number;
  zone: CentsZone;
  /** Set where the real distance is past the panel's edge. */
  clamped: 'up' | 'down' | null;
  /** The first point of a run: the line is not drawn from the point before. */
  startsRun: boolean;
};

const clampToPanel = (cents: number) => {
  return Math.max(-FOCUS_RANGE_CENTS, Math.min(FOCUS_RANGE_CENTS, cents));
};

/**
 * Cents from the target over the window. With no held note each sample is
 * measured from the note it sits on; a held note is measured from itself,
 * however far away, and the trace clamps to the edge with a direction marker.
 */
export const buildFocusTrace = (
  history: PitchHistorySnapshot,
  windowSeconds: number,
  heldMidi: number | null,
): readonly FocusPoint[] => {
  const windowMs = windowSeconds * MS_PER_SECOND;
  const windowStartMs = history.latestMs - windowMs;

  return history.trace
    .filter((sample) => sample.timeMs >= windowStartMs)
    .map((sample) => {
      const cents =
        heldMidi === null
          ? sample.cents
          : (sample.midi - heldMidi) * CENTS_PER_SEMITONE + sample.cents;
      const beyond = Math.abs(cents) > FOCUS_RANGE_CENTS;

      return {
        x: (sample.timeMs - windowStartMs) / windowMs,
        cents: clampToPanel(cents),
        zone: centsZone(cents),
        clamped: beyond ? (cents > 0 ? 'up' : 'down') : null,
        startsRun: sample.startsRun,
      };
    });
};

export type FocusReadout = {
  /** Signed cents from the target, not clamped; null with nothing sung. */
  cents: number | null;
  zone: CentsZone | null;
  /** The zone in words, for the readout and assistive technology. */
  zoneLabel: string | null;
};

export const buildFocusReadout = (
  target: FocusTarget,
  reading: PitchReading,
): FocusReadout => {
  if (!reading.active || reading.held || target.midi === null) {
    return { cents: null, zone: null, zoneLabel: null };
  }

  const cents =
    (reading.midi - target.midi) * CENTS_PER_SEMITONE + reading.cents;
  const zone = centsZone(cents);

  return { cents, zone, zoneLabel: ZONE_LABELS[zone] };
};
