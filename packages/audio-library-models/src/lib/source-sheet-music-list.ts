import { omit } from 'es-toolkit';

import {
  createSheetMusicSource,
  normalizeSheetMusicLabel,
  parseSourceSheetMusic,
  type PdfLayout,
  type SheetMusicFormat,
  type SheetMusicLocation,
  type SheetMusicPartSelection,
  type SheetMusicSource,
} from './source-sheet-music.ts';

/**
 * Pure edits to one record's `sheetMusic` list, shared by a track (saved by the
 * runtime) and a composite (saved by the composite store). The result is
 * re-read through the storage parser, so the cap, label limits and URL rules
 * hold for every write, and an empty list removes the field.
 */

export type SheetMusicAddition = {
  format: SheetMusicFormat;
  label: string;
  location: SheetMusicLocation;
  partSelection?: SheetMusicPartSelection;
};

/** `partSelection: null` returns a source to the default (vocal parts). */
export type SheetMusicChange = {
  label?: string;
  partSelection?: SheetMusicPartSelection | null;
  /** `pdfLayout: null` removes the file's own layout (the device layout applies). */
  pdfLayout?: PdfLayout | null;
};

export const createSheetMusicId = (): string =>
  `sheet-music:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Appends a source; an invalid addition, or one past the per-record limit, is ignored. */
export const addToSheetMusicList = (
  current: readonly SheetMusicSource[],
  addition: SheetMusicAddition,
  options: { id?: string; addedAt?: string } = {},
): SheetMusicSource[] => {
  const created = createSheetMusicSource({
    ...addition,
    id: options.id ?? createSheetMusicId(),
    addedAt: options.addedAt ?? new Date().toISOString(),
  });

  return parseSheetMusicList(created ? [...current, created] : current);
};

export const changeInSheetMusicList = (
  current: readonly SheetMusicSource[],
  sheetMusicId: string,
  change: SheetMusicChange,
): SheetMusicSource[] => {
  return parseSheetMusicList(
    current.map((entry) => {
      if (entry.id !== sheetMusicId) {
        return entry;
      }

      // An unusable label keeps the old one rather than blanking the row.
      const label =
        change.label === undefined
          ? undefined
          : normalizeSheetMusicLabel(change.label);
      const withoutSelection = omit(entry, ['partSelection', 'pdfLayout']);
      const partSelection =
        change.partSelection === undefined
          ? entry.partSelection
          : (change.partSelection ?? undefined);
      const pdfLayout =
        change.pdfLayout === undefined
          ? entry.pdfLayout
          : (change.pdfLayout ?? undefined);

      return {
        ...withoutSelection,
        label: label ?? entry.label,
        ...(partSelection ? { partSelection } : {}),
        ...(pdfLayout ? { pdfLayout } : {}),
      };
    }),
  );
};

export const removeFromSheetMusicList = (
  current: readonly SheetMusicSource[],
  sheetMusicId: string,
): SheetMusicSource[] => {
  return parseSheetMusicList(
    current.filter((entry) => entry.id !== sheetMusicId),
  );
};

const parseSheetMusicList = (
  list: readonly SheetMusicSource[],
): SheetMusicSource[] => parseSourceSheetMusic(list) ?? [];
