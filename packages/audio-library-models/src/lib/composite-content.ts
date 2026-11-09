import type {
  SheetMusicLocation,
  SheetMusicSource,
} from './source-sheet-music.ts';
import type { SourceLyrics } from './source-lyrics.ts';

/**
 * What a composite shows for sheet music and lyrics, read from its stems
 * (composite-tracks design Decision 11). Nothing is copied: the union and the
 * picker are computed from the stems' own records.
 */

export type ContentStem = {
  id: string;
  name: string;
};

export type StemSheetMusic = ContentStem & {
  sheetMusic: readonly SheetMusicSource[] | undefined;
};

export type StemLyrics = ContentStem & {
  lyrics: Pick<SourceLyrics, 'text'> | undefined;
};

/** Two sources are the same file when they share a Drive file id or a URL. */
export const getSheetMusicLocationKey = (
  location: SheetMusicLocation,
): string => {
  return location.kind === 'drive'
    ? `drive:${location.fileId}`
    : `url:${location.url}`;
};

export type CompositeSheetMusicEntry = {
  /** The first record that links this file, in stem order, then the composite's. */
  source: SheetMusicSource;
  /** The stems that link it, in stem order. */
  usedByStems: ContentStem[];
  /** The file is also linked on the composite itself. */
  addedToComposite: boolean;
  /** Every stem links it (the view says `all N stems`). */
  usedByAllStems: boolean;
};

/**
 * The union of every stem's sources and those added to the composite, with
 * duplicates removed by location. There is no cap here: the per-record limit
 * applies when adding to a record, not to the combined list.
 */
export const buildCompositeSheetMusic = (
  stems: readonly StemSheetMusic[],
  compositeSheetMusic: readonly SheetMusicSource[] = [],
): CompositeSheetMusicEntry[] => {
  const entries = new Map<string, CompositeSheetMusicEntry>();

  const entryFor = (source: SheetMusicSource) => {
    const key = getSheetMusicLocationKey(source.location);
    const existing = entries.get(key);

    if (existing) {
      return existing;
    }

    const created: CompositeSheetMusicEntry = {
      source,
      usedByStems: [],
      addedToComposite: false,
      usedByAllStems: false,
    };

    entries.set(key, created);

    return created;
  };

  for (const stem of stems) {
    for (const source of stem.sheetMusic ?? []) {
      const entry = entryFor(source);

      if (!entry.usedByStems.some((used) => used.id === stem.id)) {
        entry.usedByStems.push({ id: stem.id, name: stem.name });
      }
    }
  }

  for (const source of compositeSheetMusic) {
    entryFor(source).addedToComposite = true;
  }

  return [...entries.values()].map((entry) => ({
    ...entry,
    usedByAllStems:
      stems.length > 0 && entry.usedByStems.length === stems.length,
  }));
};

export type CompositeLyricsPicker = {
  /** The stems that have lyrics, in stem order. */
  choices: ContentStem[];
  /** The stems that have none (the view says which). */
  withoutLyrics: ContentStem[];
  /** The stem whose lyrics are shown; undefined when no stem has any. */
  selectedStemId: string | undefined;
  /** More than one stem has lyrics. */
  showPicker: boolean;
  /** No stem has lyrics: the view offers the existing way to add them. */
  empty: boolean;
};

/**
 * The remembered pick wins while that stem still has lyrics, otherwise the
 * first stem that has some.
 */
export const buildCompositeLyricsPicker = (
  stems: readonly StemLyrics[],
  rememberedStemId?: string,
): CompositeLyricsPicker => {
  const hasLyrics = (stem: StemLyrics) =>
    (stem.lyrics?.text.trim().length ?? 0) > 0;
  const choices = stems.filter(hasLyrics).map(({ id, name }) => ({ id, name }));
  const withoutLyrics = stems
    .filter((stem) => !hasLyrics(stem))
    .map(({ id, name }) => ({ id, name }));
  const remembered = choices.find((choice) => choice.id === rememberedStemId);

  return {
    choices,
    withoutLyrics,
    selectedStemId: (remembered ?? choices[0])?.id,
    showPicker: choices.length > 1,
    empty: choices.length === 0,
  };
};

export type CompositeSheetMusicOwner =
  | { kind: 'composite' }
  | { kind: 'stem'; stemId: string };

/**
 * Which record holds the source with this id, so an edit lands where the file
 * is linked: a stem's own list, or the composite's. The id of a union entry is
 * the first record's, so one id names one record.
 */
export const findCompositeSheetMusicOwner = (
  stems: readonly StemSheetMusic[],
  compositeSheetMusic: readonly SheetMusicSource[],
  sheetMusicId: string,
): CompositeSheetMusicOwner | undefined => {
  const stem = stems.find((candidate) =>
    candidate.sheetMusic?.some((source) => source.id === sheetMusicId),
  );

  if (stem) {
    return { kind: 'stem', stemId: stem.id };
  }

  return compositeSheetMusic.some((source) => source.id === sheetMusicId)
    ? { kind: 'composite' }
    : undefined;
};

const joinNames = (names: readonly string[]): string => {
  if (names.length <= 1) {
    return names.join('');
  }

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/** The line under a row: `Used by all 4 stems`, `Used by Bass`, `Added to this composite`. */
export const describeSheetMusicUse = (
  entry: Pick<
    CompositeSheetMusicEntry,
    'usedByStems' | 'usedByAllStems' | 'addedToComposite'
  >,
): string => {
  const used = entry.usedByAllStems
    ? `Used by all ${entry.usedByStems.length} stems`
    : entry.usedByStems.length > 0
      ? `Used by ${joinNames(entry.usedByStems.map(({ name }) => name))}`
      : undefined;
  const added = entry.addedToComposite ? 'Added to this composite' : undefined;

  return [added, used].filter(Boolean).join(' · ');
};
