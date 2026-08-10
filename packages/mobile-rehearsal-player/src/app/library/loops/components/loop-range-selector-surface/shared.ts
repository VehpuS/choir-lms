import { formatDurationLabel } from '../../../drive/utils/drive-library-view-model';

export const LOOP_SELECTOR_BACKDROP = 'rgba(20, 18, 13, 0.42)';
export const LOOP_SELECTOR_CARD_BACKGROUND = '#fffdf8';
export const LOOP_SELECTOR_ERROR_SURFACE = '#fff1ed';
export const LOOP_SELECTOR_ERROR_TEXT = '#8a2d1f';
export const LOOP_SELECTOR_INPUT_BACKGROUND = '#fff9f0';
export const LOOP_SELECTOR_PLACEHOLDER_TEXT = '#857b6c';
export const LOOP_SELECTOR_PRIMARY_ACTION_BACKGROUND = '#305c4d';
export const LOOP_SELECTOR_PRIMARY_ACTION_TEXT = '#fff8ef';
export const LOOP_SELECTOR_PRIMARY_TEXT = '#1f1c17';
export const LOOP_SELECTOR_SECONDARY_ACTION_BACKGROUND = '#f2ece1';
export const LOOP_SELECTOR_SECONDARY_TEXT = '#5f5647';

export const formatRangeLabel = (value: number) => {
  return formatDurationLabel(value) ?? '0:00';
};

const formatSecondsSegment = (value: number) => {
  return value.toString().padStart(2, '0');
};

export const formatPreciseRangeLabel = (valueMs: number) => {
  const totalTenths = Math.round(Math.max(0, valueMs) / 100);
  const wholeSeconds = Math.floor(totalTenths / 10);
  const tenths = totalTenths % 10;
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = wholeSeconds % 60;

  return `${minutes}:${formatSecondsSegment(seconds)}.${tenths}`;
};

export const formatPlaybackLabel = (seconds: number) => {
  return formatDurationLabel(Math.round(seconds * 1000)) ?? '0:00';
};
