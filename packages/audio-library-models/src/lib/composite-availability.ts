import { MIN_COMPOSITE_STEMS, type CompositeStem } from './composite-track.ts';
import type { DriveAudioSource } from './rehearsal-domain.ts';

/**
 * Which stems of a composite can play now, and the rules for re-linking and
 * removing a stem (composite-tracks design Decision 10). A stem that cannot be
 * loaded is flagged and skipped; the composite plays the rest.
 */

export type StemState = 'available' | 'missing' | 'loading';
export type CompositeState = 'playable' | 'partly-playable' | 'unavailable';

type LibraryTrack = Pick<DriveAudioSource, 'id' | 'availability'>;

export type StemAvailability = {
  stemId: string;
  state: StemState;
};

/**
 * A stem is missing when its track is not in the library or the track itself
 * cannot be played; it is loading while the caller is still fetching it, and
 * a stem still loading counts as present until it fails.
 */
export const getStemStates = (
  stems: readonly Pick<CompositeStem, 'id' | 'trackId'>[],
  library: ReadonlyMap<string, LibraryTrack>,
  loadingStemIds: ReadonlySet<string> = new Set(),
): StemAvailability[] => {
  return stems.map((stem) => {
    const track = library.get(stem.trackId);

    if (!track || track.availability.status !== 'available') {
      return { stemId: stem.id, state: 'missing' };
    }

    return {
      stemId: stem.id,
      state: loadingStemIds.has(stem.id) ? 'loading' : 'available',
    };
  });
};

/**
 * `playable` when no stem is missing, `partly-playable` when some are missing
 * but at least one is not, and `unavailable` when every stem is missing.
 */
export const getCompositeState = (
  states: readonly StemAvailability[],
): CompositeState => {
  const missing = states.filter((entry) => entry.state === 'missing').length;

  if (states.length === 0) {
    return 'unavailable';
  }

  if (missing === 0) {
    return 'playable';
  }

  return missing < states.length ? 'partly-playable' : 'unavailable';
};

/** The stems that sound: those that are not missing. */
export const getPlayableStemIds = (
  states: readonly StemAvailability[],
): string[] => {
  return states
    .filter((entry) => entry.state !== 'missing')
    .map((entry) => entry.stemId);
};

/**
 * Points a stem at another library track, keeping its name, offset and mine
 * mark. A track that is already another stem is refused (the same track twice
 * would only double that voice), and the stems come back unchanged.
 */
export const relinkStem = (
  stems: readonly CompositeStem[],
  stemId: string,
  trackId: string,
): CompositeStem[] => {
  const usedElsewhere = stems.some(
    (stem) => stem.id !== stemId && stem.trackId === trackId,
  );

  if (usedElsewhere) {
    return [...stems];
  }

  return stems.map((stem) =>
    stem.id === stemId ? { ...stem, trackId } : stem,
  );
};

export type RemoveStemResult =
  | { outcome: 'removed'; stems: CompositeStem[] }
  /** Removing would leave a single stem: ask whether to delete the composite instead. */
  | { outcome: 'ask-delete' }
  | { outcome: 'unchanged' };

export const removeStem = (
  stems: readonly CompositeStem[],
  stemId: string,
): RemoveStemResult => {
  if (!stems.some((stem) => stem.id === stemId)) {
    return { outcome: 'unchanged' };
  }

  const remaining = stems.filter((stem) => stem.id !== stemId);

  return remaining.length < MIN_COMPOSITE_STEMS
    ? { outcome: 'ask-delete' }
    : { outcome: 'removed', stems: remaining };
};
