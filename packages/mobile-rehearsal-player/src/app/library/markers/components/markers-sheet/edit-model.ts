import {
  MAX_MARKER_NAME_LENGTH,
  normalizeMarkerName,
} from '@org/audio-library-models';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

/** `m:ss`, `m:ss.s`, `ss`, or `ss.s`; up to three decimals. */
const MARKER_TIME_PATTERN = /^(?:(\d{1,3}):)?(\d{1,3})(?:\.(\d{1,3}))?$/;
const SECONDS_RANGE_MAX = SECONDS_PER_MINUTE - 1;

export const MARKER_NUDGE_STEPS: ReadonlyArray<{
  deltaMs: number;
  label: string;
}> = [
  { deltaMs: -MS_PER_SECOND, label: '−1 s' },
  { deltaMs: -100, label: '−0.1 s' },
  { deltaMs: 100, label: '+0.1 s' },
  { deltaMs: MS_PER_SECOND, label: '+1 s' },
];

export const MARKER_TIME_FORMAT_HINT = 'mm:ss.s';
export const MARKER_TIME_INVALID_MESSAGE = 'Enter a time like 1:12.4';
export const MARKER_TIME_PAST_END_MESSAGE = 'Past the end of this audio';
export const MARKER_NAME_EMPTY_MESSAGE = 'Enter a name';

/** Keeps a position inside the audio: 0 up to the length, when known. */
export const clampMarkerPosition = (
  positionMs: number,
  durationMs?: number,
): number => {
  const rounded = Math.max(0, Math.round(positionMs));

  return durationMs === undefined ? rounded : Math.min(rounded, durationMs);
};

export const nudgeMarkerPosition = (
  positionMs: number,
  deltaMs: number,
  durationMs?: number,
): number => {
  // A marker past the end can still be nudged back toward the audio.
  if (durationMs !== undefined && positionMs > durationMs) {
    return clampMarkerPosition(
      Math.min(positionMs + deltaMs, positionMs),
      durationMs,
    );
  }

  return clampMarkerPosition(positionMs + deltaMs, durationMs);
};

export type MarkerTimeParse =
  | { isValid: true; positionMs: number }
  | { isValid: false; error: string };

/** Reads a typed time. Seconds past 59 are only valid without minutes. */
export const parseMarkerTimeInput = (
  text: string,
  durationMs?: number,
): MarkerTimeParse => {
  const match = MARKER_TIME_PATTERN.exec(text.trim());

  if (!match) {
    return { isValid: false, error: MARKER_TIME_INVALID_MESSAGE };
  }

  const [, minutesText, secondsText = '0', fractionText = ''] = match;
  const seconds = Number(secondsText);

  if (minutesText !== undefined && seconds > SECONDS_RANGE_MAX) {
    return { isValid: false, error: MARKER_TIME_INVALID_MESSAGE };
  }

  const fractionMs = Number(fractionText.padEnd(3, '0'));
  const positionMs =
    (Number(minutesText ?? 0) * SECONDS_PER_MINUTE + seconds) * MS_PER_SECOND +
    fractionMs;

  if (durationMs !== undefined && positionMs > durationMs) {
    return { isValid: false, error: MARKER_TIME_PAST_END_MESSAGE };
  }

  return { isValid: true, positionMs };
};

export type MarkerNameValidation =
  | { isValid: true; name: string }
  | { isValid: false; error: string };

export const validateMarkerNameInput = (text: string): MarkerNameValidation => {
  const name = normalizeMarkerName(text);

  return name.length > 0
    ? { isValid: true, name }
    : { isValid: false, error: MARKER_NAME_EMPTY_MESSAGE };
};

export { MAX_MARKER_NAME_LENGTH };
