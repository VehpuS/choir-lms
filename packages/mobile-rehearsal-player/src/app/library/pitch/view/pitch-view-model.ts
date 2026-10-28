import {
  centsZone,
  midiToNoteName,
  type CentsZone,
} from '@org/audio-library-models';

import type { PitchState } from '../pitch-store-types';
import {
  resolveTarget,
  ZONE_LABELS,
  type FocusTarget,
} from './pitch-focus-model';
import {
  getMonitorModel,
  type MonitorAction,
  type PitchMonitorModel,
} from './pitch-monitor-model';

const PERCENT = 100;
const CENTS_PER_SEMITONE = 100;
/** Failures the user has to act on read as warnings, not as plain states. */
const WARNING_STATUSES: readonly PitchState['status'][] = [
  'blocked',
  'unavailable',
  'in-use',
];

export type PitchViewLayout = 'portrait' | 'landscape';

/** A phone held sideways puts the focus panel beside the progression. */
export const getPitchViewLayout = (
  width: number,
  height: number,
): PitchViewLayout => (width > height ? 'landscape' : 'portrait');

export type ViewReadout =
  | {
      kind: 'note';
      /** The sung note, whatever the target is. */
      name: string;
      /** `+8 cents`, or `+200 from A3` against a held target. */
      distanceText: string;
      zone: CentsZone;
      zoneLabel: string;
      /** For assistive technology: the note, the distance and the zone in words. */
      spokenLabel: string;
    }
  | { kind: 'idle'; title: string; detail: string }
  | {
      kind: 'message';
      title: string;
      detail: string;
      tone: 'neutral' | 'warning';
      action: { kind: MonitorAction; label: string } | null;
    };

const signed = (cents: number) => {
  const rounded = Math.round(cents);

  return rounded > 0 ? `+${rounded}` : `${rounded}`;
};

/** The large readout: the sung note, its distance and the zone in words. */
export const getViewReadout = (
  state: PitchState,
  heldMidi: number | null,
  monitor: PitchMonitorModel = getMonitorModel(state),
): ViewReadout => {
  const { message } = monitor;

  // Any state but listening has a message (and maybe a button) to show.
  if (state.status !== 'listening' && message) {
    return {
      kind: 'message',
      title: message.title,
      detail: message.body,
      tone: WARNING_STATUSES.includes(state.status) ? 'warning' : 'neutral',
      action: message.action,
    };
  }

  const { reading } = state;

  if (!reading.active) {
    return { kind: 'idle', title: 'Listening', detail: 'sing a note' };
  }

  const target = resolveTarget(heldMidi, reading);
  const name = midiToNoteName(reading.midi);
  // Measured from the target, so a held note reads its real distance. A note
  // the pipeline is holding through a short gap keeps its last zone, so the
  // readout does not blank between syllables.
  const distance =
    reading.cents +
    (target.midi === null
      ? 0
      : (reading.midi - target.midi) * CENTS_PER_SEMITONE);
  const zone = centsZone(distance);
  const zoneLabel = ZONE_LABELS[zone];
  const distanceText = target.isHeld
    ? `${signed(distance)} from ${target.name}`
    : `${signed(distance)} cents`;

  return {
    kind: 'note',
    name,
    distanceText,
    zone,
    zoneLabel,
    spokenLabel: `${name}, ${distanceText}, ${zoneLabel}`,
  };
};

export type ReadoutBar = {
  pitchText: string;
  confidenceText: string;
  /** `Stop` while the user has listening on, otherwise `Listen`. */
  listenLabel: 'Listen' | 'Stop';
  statusText: string;
  statusTone: 'ok' | 'warn' | 'off';
};

/** The bar along the bottom: pitch, confidence, listening toggle, state. */
export const getReadoutBar = (state: PitchState): ReadoutBar => {
  const { reading } = state;
  const sounding = state.status === 'listening' && reading.active;
  const monitor = getMonitorModel(state);

  return {
    pitchText: sounding ? midiToNoteName(reading.midi) : '--',
    confidenceText: sounding
      ? `${Math.round(reading.clarity * PERCENT)}%`
      : '--',
    listenLabel: state.listening ? 'Stop' : 'Listen',
    statusText: monitor.statusText,
    statusTone:
      state.status === 'listening'
        ? 'ok'
        : state.status === 'off'
          ? 'off'
          : 'warn',
  };
};

export type TargetChip = {
  label: string;
  isHeld: boolean;
  accessibilityLabel: string;
};

/** The chip that holds the current note as the target, or lets it go again. */
export const getTargetChip = (
  target: FocusTarget,
  layout: PitchViewLayout,
): TargetChip => {
  const compact = layout === 'landscape';

  if (target.isHeld) {
    return {
      label: compact
        ? `Target: ${target.name}`
        : `Target: ${target.name} (held)`,
      isHeld: true,
      accessibilityLabel: `Target ${target.name} held. Press to follow the nearest note.`,
    };
  }

  return {
    label: compact ? 'Target: nearest' : 'Target: nearest note',
    isHeld: false,
    accessibilityLabel:
      'Target is the nearest note. Press to hold the current note.',
  };
};

/** The chip's press: let go of a held note, else hold the one being sung. */
export const toggleHeld = (
  heldMidi: number | null,
  state: PitchState,
): number | null => {
  if (heldMidi !== null) {
    return null;
  }

  return state.reading.active ? state.reading.midi : null;
};

/** Pressing a note on the roll's scale holds it; pressing it again lets go. */
export const holdFromScale = (
  heldMidi: number | null,
  pressedMidi: number,
): number | null => (heldMidi === pressedMidi ? null : pressedMidi);
