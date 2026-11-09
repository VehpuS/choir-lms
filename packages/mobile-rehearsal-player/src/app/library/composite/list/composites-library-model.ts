import {
  getCompositeBadgeLabel,
  getCompositeLibraryDurationMs,
  getCompositeLibraryState,
  getStemStates,
  type CompositeLibrary,
  type CompositeState,
  type CompositeTrack,
} from '@org/audio-library-models';
import { sortBy } from 'es-toolkit';

import { formatDurationLabel } from '../../drive/utils/drive-library-metadata';

/**
 * What the Library `Composites` view shows (composite-tracks 7.1): a row per
 * composite with the `Composite · N stems` badge, its length, and how many
 * stems can play now. Pure; the view and the store sit around it.
 */

export const COMPOSITES_EMPTY_TITLE = 'No composites yet';
export const COMPOSITES_EMPTY_HINT =
  'Select two or more tracks in “Tracks”, then choose “Make composite…”.';
const META_SEPARATOR = ' · ';

export type CompositeLibraryRow = {
  id: string;
  name: string;
  /** `Composite · 4 stems`. */
  badge: string;
  /** Length, then a note when some stems cannot play; empty parts are left out. */
  meta: string;
  state: CompositeState;
  /** False when every stem is missing: the row shows but does not start. */
  isPlayable: boolean;
  stemCount: number;
};

const normalize = (text: string) => text.trim().toLocaleLowerCase();

const describeStemAvailability = (
  composite: Pick<CompositeTrack, 'stems'>,
  library: CompositeLibrary,
  state: CompositeState,
): string | undefined => {
  if (state === 'playable') {
    return undefined;
  }

  if (state === 'unavailable') {
    return 'Every stem is missing';
  }

  const byId = new Map(library.sources.map((source) => [source.id, source]));
  const missing = getStemStates(composite.stems, byId).filter(
    (entry) => entry.state === 'missing',
  ).length;

  return `${missing} ${missing === 1 ? 'stem' : 'stems'} missing`;
};

export const buildCompositeLibraryRow = (
  composite: Pick<CompositeTrack, 'id' | 'name' | 'stems'>,
  library: CompositeLibrary,
): CompositeLibraryRow => {
  const state = getCompositeLibraryState(composite, library);
  const length = formatDurationLabel(
    getCompositeLibraryDurationMs(composite, library),
  );
  const note = describeStemAvailability(composite, library, state);

  return {
    id: composite.id,
    name: composite.name,
    badge: getCompositeBadgeLabel(composite.stems.length),
    meta: [length, note].filter(Boolean).join(META_SEPARATOR),
    state,
    isPlayable: state !== 'unavailable',
    stemCount: composite.stems.length,
  };
};

/** A composite matches a query by its name or by the name of any of its stems. */
export const compositeMatchesQuery = (
  composite: Pick<CompositeTrack, 'name' | 'stems'>,
  query: string | null,
): boolean => {
  const needle = normalize(query ?? '');

  if (!needle) {
    return true;
  }

  return [composite.name, ...composite.stems.map((stem) => stem.name)].some(
    (text) => normalize(text).includes(needle),
  );
};

/** The rows for the view, filtered by the search query and sorted by name. */
export const buildCompositeLibraryRows = (options: {
  composites: readonly Pick<CompositeTrack, 'id' | 'name' | 'stems'>[];
  library: CompositeLibrary;
  query: string | null;
}): CompositeLibraryRow[] => {
  const matching = options.composites.filter((composite) =>
    compositeMatchesQuery(composite, options.query),
  );

  return sortBy(
    matching.map((composite) =>
      buildCompositeLibraryRow(composite, options.library),
    ),
    [(row) => normalize(row.name)],
  );
};

/** What a search that matches no composite says, so the area is not left blank. */
export const resolveCompositesNoResultsMessage = (
  query: string | null,
  rowCount: number,
): string | null => {
  const trimmed = query?.trim();

  return trimmed && rowCount === 0 ? `No composites match “${trimmed}”.` : null;
};
