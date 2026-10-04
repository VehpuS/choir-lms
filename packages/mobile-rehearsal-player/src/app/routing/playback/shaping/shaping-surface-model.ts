import {
  MAX_PITCH_SEMITONES,
  MAX_SPEED_MULTIPLIER,
  MIN_PITCH_SEMITONES,
  MIN_SPEED_MULTIPLIER,
  clampPitchSemitones,
  formatPitchSemitones,
  formatSpeedMultiplier,
  isPitchShaped,
  isPlaybackShapingNeutral,
  isSpeedShaped,
  snapSpeedMultiplier,
  type TempoSource,
} from '@org/audio-library-models';

import type {
  AdjustedSaveAvailability,
  AdjustedSaveKind,
} from './adjusted-save-model';
import { PITCH_UNAVAILABLE_REASON } from '../../../library/playback/shaping/playback-shaping-capabilities';

type ShapingAxes = {
  pitchSemitones: number;
  speedMultiplier: number;
};

export type PlaybackShapingSaveFeedback = {
  message: string;
  tone: 'error' | 'success';
};

/** Saving the shaping as an adjusted loop or track (task 6.4). */
export type PlaybackShapingSaveControls = {
  availability: AdjustedSaveAvailability;
  feedback: PlaybackShapingSaveFeedback | null;
  isSaving: boolean;
  onSave: (kind: AdjustedSaveKind) => void;
};

/** What the playback surfaces need from the shaping session. */
export type PlaybackShapingControls = {
  /** What the user set for the session (carried through a queue). */
  ambient: ShapingAxes;
  /** False where pitch cannot be shifted (native, tasks 8.51). */
  canShapePitch: boolean;
  /** What is applied now: the item's own transform, else the ambient. */
  effective: ShapingAxes;
  isItemTransformActive: boolean;
  onReset: () => void;
  onSetPitchSemitones: (semitones: number) => void;
  onSetSpeedMultiplier: (multiplier: number) => void;
  /** Absent where saving is not wired (previews, tests). */
  save?: PlaybackShapingSaveControls;
};

export const SESSION_SCOPE_STATEMENT =
  'Applies to this session only until saved.';
export const SPEED_HELPER = 'Continuous. Pitch is never shifted by speed.';
export const PITCH_HELPER = 'Semitone steps, −12 to +12. Tempo is unchanged.';
export const TEMPO_SOURCE_HELPER =
  'BPM and score-follow (MIDI / MusicXML) arrive later; dynamic tempo maps then replace the flat multiplier.';

/** A step of 0.01 matches the two-decimal readout and the stored precision. */
export const SPEED_SLIDER_STEP = 0.01;
export const PITCH_STEP_SEMITONES = 1;

const SPEED_RANGE = MAX_SPEED_MULTIPLIER - MIN_SPEED_MULTIPLIER;
const DETENT_MULTIPLIER = 1;

const toRatio = (multiplier: number) => {
  return (multiplier - MIN_SPEED_MULTIPLIER) / SPEED_RANGE;
};

export type SpeedScaleLabel = { label: string; ratio: number };

/**
 * The speed track is linear (decided 2026-10-03), so 1.00× sits left of the
 * middle: the detent tick and its scale label are placed by ratio.
 */
export const getSpeedControlModel = (speedMultiplier: number) => {
  return {
    accessibilityValueText: formatSpeedMultiplier(speedMultiplier),
    detentRatio: toRatio(DETENT_MULTIPLIER),
    isShaped: isSpeedShaped({ speedMultiplier }),
    maximum: MAX_SPEED_MULTIPLIER,
    minimum: MIN_SPEED_MULTIPLIER,
    readout: formatSpeedMultiplier(speedMultiplier),
    scaleLabels: [
      { label: formatSpeedMultiplier(MIN_SPEED_MULTIPLIER), ratio: 0 },
      {
        label: formatSpeedMultiplier(DETENT_MULTIPLIER),
        ratio: toRatio(DETENT_MULTIPLIER),
      },
      { label: formatSpeedMultiplier(MAX_SPEED_MULTIPLIER), ratio: 1 },
    ] satisfies SpeedScaleLabel[],
    step: SPEED_SLIDER_STEP,
  };
};

/** The multiplier for a slider event: clamped, and snapped onto 1.00×. */
export const resolveSpeedSliderValue = (value: number | number[]) => {
  return snapSpeedMultiplier(Array.isArray(value) ? value[0] : value);
};

const PITCH_STRIP_HALF_BARS = 4;

export type PitchStripBar = {
  kind: 'filled' | 'idle' | 'zero';
  position: number;
};

/**
 * Nine bars, zero in the middle at full height: bars from zero up to the
 * current value are accent, the rest idle. The strip is proportional, so it
 * spans the whole −12…+12 range.
 */
export const getPitchStripBars = (pitchSemitones: number): PitchStripBar[] => {
  const valuePosition = Math.round(
    (clampPitchSemitones(pitchSemitones) / MAX_PITCH_SEMITONES) *
      PITCH_STRIP_HALF_BARS,
  );

  return Array.from({ length: PITCH_STRIP_HALF_BARS * 2 + 1 }, (_, index) => {
    const position = index - PITCH_STRIP_HALF_BARS;

    if (position === 0) {
      return { kind: 'zero', position };
    }

    const isBetweenZeroAndValue =
      valuePosition !== 0 &&
      Math.sign(position) === Math.sign(valuePosition) &&
      Math.abs(position) <= Math.abs(valuePosition);

    return { kind: isBetweenZeroAndValue ? 'filled' : 'idle', position };
  });
};

export const stepPitchSemitones = (current: number, delta: number) => {
  return clampPitchSemitones(current + delta);
};

/**
 * The pitch stepper, live or inert. Inert (native) keeps the same layout and
 * states why; it has no handlers, so it can never apply a pitch it cannot
 * honor (design Decision 6).
 */
export const getPitchControlModel = (options: {
  canShapePitch: boolean;
  pitchSemitones: number;
}) => {
  const { canShapePitch, pitchSemitones } = options;

  return {
    bars: getPitchStripBars(pitchSemitones),
    canStepDown: canShapePitch && pitchSemitones > MIN_PITCH_SEMITONES,
    canStepUp: canShapePitch && pitchSemitones < MAX_PITCH_SEMITONES,
    decreaseLabel: 'Lower pitch by one semitone',
    increaseLabel: 'Raise pitch by one semitone',
    isInert: !canShapePitch,
    isShaped: canShapePitch && isPitchShaped({ pitchSemitones }),
    readout: formatPitchSemitones(pitchSemitones),
    unavailableReason: canShapePitch ? null : PITCH_UNAVAILABLE_REASON,
  };
};

export type TempoSourceChip = {
  disabled: boolean;
  key: TempoSource;
  label: string;
  selected: boolean;
};

/** Only the multiplier is implemented; BPM and score show inert (Decision 7). */
export const getTempoSourceChips = (): TempoSourceChip[] => {
  return [
    { disabled: false, key: 'multiplier', label: 'Multiplier', selected: true },
    { disabled: true, key: 'bpm', label: 'BPM', selected: false },
    { disabled: true, key: 'score', label: 'Follow score', selected: false },
  ];
};

/** Reset is offered only when the session itself is shaped. */
export const canResetShaping = (ambient: ShapingAxes) => {
  return !isPlaybackShapingNeutral(ambient);
};

export type PracticeShapingTile = {
  accessibilityLabel: string;
  isInert: boolean;
  isShaped: boolean;
  key: 'pitch' | 'speed';
  kicker: string;
  readout: string;
};

const INERT_PITCH_TILE_READOUT = '—';

/** The 1f practice row's Speed and Pitch readout tiles; both open 1i. */
export const getPracticeShapingTiles = (
  controls: Pick<PlaybackShapingControls, 'canShapePitch' | 'effective'>,
): PracticeShapingTile[] => {
  const speed = getSpeedControlModel(controls.effective.speedMultiplier);
  const pitch = getPitchControlModel({
    canShapePitch: controls.canShapePitch,
    pitchSemitones: controls.effective.pitchSemitones,
  });
  const pitchReadout = pitch.isInert ? INERT_PITCH_TILE_READOUT : pitch.readout;

  return [
    {
      accessibilityLabel: `Speed ${speed.readout}. Open speed and pitch`,
      isInert: false,
      isShaped: speed.isShaped,
      key: 'speed',
      kicker: 'Speed',
      readout: speed.readout,
    },
    {
      accessibilityLabel: pitch.isInert
        ? `Pitch. ${PITCH_UNAVAILABLE_REASON}. Open speed and pitch`
        : `Pitch ${pitch.readout}. Open speed and pitch`,
      isInert: pitch.isInert,
      isShaped: pitch.isShaped,
      key: 'pitch',
      kicker: 'Pitch',
      readout: pitchReadout,
    },
  ];
};
