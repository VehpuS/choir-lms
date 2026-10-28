import {
  centsZone,
  midiToNoteName,
  type CentsZone,
} from '@org/audio-library-models';

import type { PitchHistorySnapshot } from './pitch-history';
import { ZONE_LABELS } from './pitch-focus-model';
import type { PitchState } from '../pitch-store-types';

const MS_PER_SECOND = 1000;
const GAUGE_RANGE_CENTS = 50;
const SPARK_SECONDS = 4;
const SPARK_BUCKETS = 24;
/** The sparkline never zooms in tighter than this, so a steady note is flat. */
const SPARK_MIN_SPAN_SEMITONES = 4;
const CENTS_PER_SEMITONE = 100;

export type MonitorAction = 'listen' | 'continue';

export type MonitorNote = {
  name: string;
  /** Signed and rounded, for example `-10`. */
  centsText: string;
  /** 0 at -50 cents, 0.5 on the note, 1 at +50 cents. */
  gauge: number;
  zone: CentsZone;
  zoneLabel: string;
  /** What assistive technology reads on focus, for example `A3, 8 cents sharp`. */
  spokenLabel: string;
};

export type MonitorMessage = {
  title: string;
  body: string;
  action: { kind: MonitorAction; label: string } | null;
};

export type MonitorNotice = {
  kind: 'headphones' | 'background';
  text: string;
};

export type PitchMonitorModel = {
  /** The state in words, so it never depends on colour alone. */
  statusText: string;
  note: MonitorNote | null;
  /** Shown when listening but nothing sung, or when there is no note to show. */
  message: MonitorMessage | null;
  notice: MonitorNotice | null;
};

const LISTEN: MonitorMessage['action'] = { kind: 'listen', label: 'Listen' };

const MESSAGES: Record<
  Exclude<PitchState['status'], 'listening'>,
  MonitorMessage
> = {
  off: {
    title: 'Not listening.',
    body: 'Press "Listen" to start.',
    action: LISTEN,
  },
  explain: {
    title: 'Use the microphone?',
    body: 'Sound is analysed on this device and never stored or sent.',
    action: { kind: 'continue', label: 'Continue' },
  },
  starting: {
    title: 'Starting…',
    body: 'Opening the microphone.',
    action: null,
  },
  'paused-hidden': {
    title: 'Paused.',
    body: 'Paused while the app was in the background. It resumes on its own.',
    action: null,
  },
  interrupted: {
    title: 'Interrupted.',
    body: 'Listening was interrupted. It resumes on its own.',
    action: null,
  },
  blocked: {
    title: 'Microphone blocked.',
    body: "Allow it for this site in the address bar or the browser's site settings, then press “Listen”.",
    action: LISTEN,
  },
  unavailable: {
    title: 'No microphone found.',
    body: 'Connect one, then press "Listen".',
    action: LISTEN,
  },
  'in-use': {
    title: 'Microphone in use.',
    body: 'Another app is using it. Close it, then press "Listen".',
    action: LISTEN,
  },
};

const NOTICES: Record<MonitorNotice['kind'], string> = {
  headphones:
    'Pitch detection assumes headphones. Speakers let the track and piano reach the microphone.',
  background: 'Paused while the app was in the background; listening again.',
};

const STATUS_TEXT: Record<PitchState['status'], string> = {
  off: 'Not listening',
  explain: 'Waiting for permission',
  starting: 'Starting',
  listening: 'Listening',
  'paused-hidden': 'Paused in the background',
  interrupted: 'Interrupted',
  blocked: 'Microphone blocked',
  unavailable: 'No microphone',
  'in-use': 'Microphone in use',
};

const signed = (cents: number) => {
  const rounded = Math.round(cents);

  return rounded > 0 ? `+${rounded}` : `${rounded}`;
};

const toNote = (reading: Extract<PitchState['reading'], { active: true }>) => {
  const name = midiToNoteName(reading.midi);
  const rounded = Math.round(reading.cents);
  const zone = centsZone(reading.cents);
  const direction = rounded > 0 ? 'sharp' : rounded < 0 ? 'flat' : 'in tune';
  const spoken =
    rounded === 0
      ? `${name}, in tune`
      : `${name}, ${Math.abs(rounded)} cents ${direction}`;
  const clamped = Math.max(
    -GAUGE_RANGE_CENTS,
    Math.min(GAUGE_RANGE_CENTS, reading.cents),
  );

  return {
    name,
    centsText: signed(reading.cents),
    gauge: (clamped + GAUGE_RANGE_CENTS) / (2 * GAUGE_RANGE_CENTS),
    zone,
    zoneLabel: ZONE_LABELS[zone],
    spokenLabel: spoken,
  };
};

const pendingNotice = (state: PitchState): MonitorNotice | null => {
  if (state.status !== 'listening') {
    return null;
  }

  const kind = state.headphonesNotePending
    ? 'headphones'
    : state.backgroundNoticePending
      ? 'background'
      : null;

  return kind ? { kind, text: NOTICES[kind] } : null;
};

/** What the monitor strip shows for the pitch store's current state. */
export const getMonitorModel = (state: PitchState): PitchMonitorModel => {
  const base = {
    statusText: STATUS_TEXT[state.status],
    notice: pendingNotice(state),
  };

  if (state.status !== 'listening') {
    return { ...base, note: null, message: MESSAGES[state.status] };
  }

  if (!state.reading.active) {
    return {
      ...base,
      note: null,
      message: { title: 'Listening', body: 'sing a note', action: null },
    };
  }

  return { ...base, note: toNote(state.reading), message: null };
};

/**
 * A few seconds of pitch for the strip's sparkline: one value per time
 * bucket (0 low, 1 high, null where nothing was sung), scaled to what was
 * sung but never tighter than a few semitones.
 */
export const buildSparkline = (
  history: PitchHistorySnapshot,
): readonly (number | null)[] => {
  const windowMs = SPARK_SECONDS * MS_PER_SECOND;
  const startMs = history.latestMs - windowMs;
  const bucketMs = windowMs / SPARK_BUCKETS;
  const values: (number | null)[] = new Array(SPARK_BUCKETS).fill(null);

  history.trace.forEach((sample) => {
    const index = Math.floor((sample.timeMs - startMs) / bucketMs);

    if (index >= 0 && index < SPARK_BUCKETS) {
      values[index] = sample.midi + sample.cents / CENTS_PER_SEMITONE;
    }
  });

  const sung = values.filter((value): value is number => value !== null);

  if (sung.length === 0) {
    return values;
  }

  const low = Math.min(...sung);
  const high = Math.max(...sung);
  const span = Math.max(high - low, SPARK_MIN_SPAN_SEMITONES);
  const bottom = (low + high) / 2 - span / 2;

  return values.map((value) =>
    value === null ? null : (value - bottom) / span,
  );
};
