import { formatDurationLabel } from '../../../drive/utils/drive-library-view-model';

import { appTheme } from '../../../../utils/theme';

export const LOOP_SELECTOR_BACKDROP = appTheme.colors.scrim;
export const LOOP_SELECTOR_CARD_BACKGROUND = appTheme.colors.bg;
export const LOOP_SELECTOR_ERROR_SURFACE = appTheme.colors.dangerFill;
export const LOOP_SELECTOR_ERROR_TEXT = appTheme.colors.danger;
export const LOOP_SELECTOR_INPUT_BACKGROUND = appTheme.colors.surface;
export const LOOP_SELECTOR_PLACEHOLDER_TEXT = appTheme.colors.textFaint;
export const LOOP_SELECTOR_PRIMARY_ACTION_BACKGROUND =
  appTheme.colors.surfaceAccent;
export const LOOP_SELECTOR_PRIMARY_ACTION_TEXT = appTheme.colors.accentOnTint;
export const LOOP_SELECTOR_PRIMARY_TEXT = appTheme.colors.text;
export const LOOP_SELECTOR_SECONDARY_ACTION_BACKGROUND =
  appTheme.colors.surface;
export const LOOP_SELECTOR_SECONDARY_TEXT = appTheme.colors.textMuted;

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
