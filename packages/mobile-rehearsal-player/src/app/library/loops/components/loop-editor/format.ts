import { formatDurationLabel } from '../../../drive/utils/drive-library-view-model';

const TENTHS_PER_SECOND = 10;
const SECONDS_PER_MINUTE = 60;

export const formatLoopEditorScale = (valueMs: number) => {
  return formatDurationLabel(valueMs) ?? '0:00';
};

/** `1:12.4`: minutes, seconds, and tenths, which the nudge step can change. */
export const formatLoopEditorPrecise = (valueMs: number) => {
  const totalTenths = Math.round(Math.max(0, valueMs) / 100);
  const wholeSeconds = Math.floor(totalTenths / TENTHS_PER_SECOND);
  const tenths = totalTenths % TENTHS_PER_SECOND;
  const minutes = Math.floor(wholeSeconds / SECONDS_PER_MINUTE);
  const seconds = wholeSeconds % SECONDS_PER_MINUTE;

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
};
