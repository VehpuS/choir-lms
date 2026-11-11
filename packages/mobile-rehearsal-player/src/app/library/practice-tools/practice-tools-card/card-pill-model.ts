import { formatRecordingDuration } from '@org/audio-library-models';

/**
 * What the collapsed card's pill says: the running take's clock first (a take
 * must never be forgotten), then the sung note. Null when neither applies, so
 * the pill falls back to its plain name.
 */
export const getCardPillLabel = ({
  recordingElapsedMs,
  sungNote,
}: {
  /** Set while a take is recording. */
  recordingElapsedMs: number | null;
  /** The sung note's name, or null when nothing is sung. */
  sungNote: string | null;
}): string | null => {
  const parts = [
    recordingElapsedMs === null
      ? null
      : formatRecordingDuration(recordingElapsedMs),
    sungNote,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join('  ') : null;
};
