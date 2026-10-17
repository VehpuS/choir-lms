import type { SheetMusicSource } from '@org/audio-library-models';

import { SHEET_MUSIC_FORMAT_LABELS } from '../format-labels';

const LABEL_FORMAT_SEPARATOR = ' · ';

const labelKey = (source: SheetMusicSource) =>
  source.label.trim().toLowerCase();

/**
 * The text of each source's chip, by source id. A label shared by two sources
 * (a MIDI and a MusicXML of one piece are labelled alike, since labels come
 * from file names without their extension) gets its format appended so the
 * chips can be told apart; a unique label is left as it is, and stored labels
 * are never changed.
 */
export const resolveSourceChipLabels = (
  sources: readonly SheetMusicSource[],
): Record<string, string> => {
  const countByLabel = new Map<string, number>();

  for (const source of sources) {
    countByLabel.set(
      labelKey(source),
      (countByLabel.get(labelKey(source)) ?? 0) + 1,
    );
  }

  return Object.fromEntries(
    sources.map((source) => {
      const isShared = (countByLabel.get(labelKey(source)) ?? 0) > 1;
      const label = isShared
        ? `${source.label.trim()}${LABEL_FORMAT_SEPARATOR}${SHEET_MUSIC_FORMAT_LABELS[source.format]}`
        : source.label;

      return [source.id, label];
    }),
  );
};
