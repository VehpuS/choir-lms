import {
  getCompositeState,
  getStemStates,
  type CompositeState,
} from './composite-availability.ts';
import {
  getCompositeDurationMs,
  type CompositeTrack,
} from './composite-track.ts';
import {
  type DriveAudioSource,
  type PlayableItem,
  type PlaylistEntry,
} from './rehearsal-domain.ts';

/**
 * A composite as a playable item (composite-tracks design Decision 1 and the
 * spike 1.1 decision): a `'composite'` kind with a synthetic audio source whose
 * id is the composite id, whose duration comes from the stems, and which has no
 * Drive file. The composite is therefore its own marker, loop and offline owner
 * through the code that already reads `item.source`.
 */

export const COMPOSITE_ITEM_PREFIX = 'composite:';
export const COMPOSITE_MIME_TYPE = 'audio/x-composite';
const NO_DRIVE_FILE_ID = '';

export const getCompositeBadgeLabel = (stemCount: number): string => {
  return `Composite · ${stemCount} ${stemCount === 1 ? 'stem' : 'stems'}`;
};

type LibraryTrack = Pick<
  DriveAudioSource,
  'id' | 'availability' | 'durationMs'
>;

export type CompositeLibrary = {
  sources: readonly LibraryTrack[];
};

const toLibraryMap = (library: CompositeLibrary) => {
  return new Map(library.sources.map((source) => [source.id, source]));
};

/**
 * Whether a source is a composite's synthetic one. A loop of a composite is a
 * `loop` item over such a source, so the engine is chosen by the source and not
 * by the item kind.
 */
export const isCompositeSource = (
  source: Pick<DriveAudioSource, 'mimeType'>,
): boolean => source.mimeType === COMPOSITE_MIME_TYPE;

/**
 * Synthetic sources to add to the saved sources wherever an owner is resolved
 * (markers, loops, lyrics, sheet music), so a composite is its own owner
 * through the code that already walks `sources`.
 */
export const createCompositeOwnerSources = (
  composites: readonly Pick<
    CompositeTrack,
    'id' | 'name' | 'createdAt' | 'stems' | 'markers'
  >[],
  library: CompositeLibrary,
): DriveAudioSource[] => {
  return composites.map((composite) =>
    createCompositeSource(composite, {
      durationMs: getCompositeLibraryDurationMs(composite, library),
      isAvailable:
        getCompositeLibraryState(composite, library) !== 'unavailable',
    }),
  );
};

/** Whether the item is a composite, whose `source` is synthetic. */
export const isCompositeItem = (item: Pick<PlayableItem, 'kind'>): boolean =>
  item.kind === 'composite';

/** The state of a composite against the library: playable, partly or unavailable. */
export const getCompositeLibraryState = (
  composite: Pick<CompositeTrack, 'stems'>,
  library: CompositeLibrary,
): CompositeState => {
  return getCompositeState(
    getStemStates(composite.stems, toLibraryMap(library)),
  );
};

/**
 * The composite's length from its stems, or undefined while a stem that is
 * still in the library has no known duration. A stem that left the library
 * does not count, since it will not sound.
 */
export const getCompositeLibraryDurationMs = (
  composite: Pick<CompositeTrack, 'stems'>,
  library: CompositeLibrary,
): number | undefined => {
  const byId = toLibraryMap(library);
  const present = composite.stems.filter((stem) => byId.has(stem.trackId));

  return getCompositeDurationMs(
    present.map((stem) => ({
      offsetMs: stem.offsetMs,
      durationMs: byId.get(stem.trackId)?.durationMs,
    })),
  );
};

/** The synthetic source: no Drive file, the composite id as its own id. */
export const createCompositeSource = (
  composite: Pick<CompositeTrack, 'id' | 'name' | 'createdAt' | 'markers'>,
  options: { durationMs?: number; isAvailable?: boolean } = {},
): DriveAudioSource => {
  return {
    id: composite.id,
    provider: 'google-drive',
    driveFileId: NO_DRIVE_FILE_ID,
    name: composite.name,
    mimeType: COMPOSITE_MIME_TYPE,
    ...(options.durationMs !== undefined
      ? { durationMs: options.durationMs }
      : {}),
    ...(composite.markers ? { markers: composite.markers } : {}),
    createdAt: composite.createdAt,
    availability:
      options.isAvailable === false
        ? { status: 'unavailable', reason: 'missing' }
        : { status: 'available' },
  };
};

export const createCompositePlayableItem = (
  composite: Pick<
    CompositeTrack,
    'id' | 'name' | 'createdAt' | 'stems' | 'markers'
  >,
  options: {
    durationMs?: number;
    isAvailable?: boolean;
    playlistId?: string;
    playlistEntryId?: string;
  } = {},
): PlayableItem => {
  const source = createCompositeSource(composite, options);

  return {
    id: `${COMPOSITE_ITEM_PREFIX}${composite.id}`,
    kind: 'composite',
    title: composite.name,
    sourceId: composite.id,
    source,
    range: { startMs: 0, endMs: source.durationMs ?? null },
    playlistId: options.playlistId,
    ...(options.playlistEntryId
      ? { playlistEntryId: options.playlistEntryId }
      : {}),
    description: getCompositeBadgeLabel(composite.stems.length),
  };
};

/**
 * The item for a composite against the library, or `null` when every stem is
 * missing (the composite is unavailable and does not start).
 */
export const resolveCompositePlayableItem = (
  composite: Pick<
    CompositeTrack,
    'id' | 'name' | 'createdAt' | 'stems' | 'markers'
  >,
  library: CompositeLibrary,
  options: { playlistId?: string; playlistEntryId?: string } = {},
): PlayableItem | null => {
  if (getCompositeLibraryState(composite, library) === 'unavailable') {
    return null;
  }

  return createCompositePlayableItem(composite, {
    ...options,
    durationMs: getCompositeLibraryDurationMs(composite, library),
  });
};

export const createPlaylistEntryFromComposite = (
  composite: Pick<CompositeTrack, 'id' | 'name' | 'stems'>,
  createdAt: string,
  options?: { playlistId?: string; sortIndex?: number },
): PlaylistEntry => {
  return {
    id: `entry:composite:${composite.id}:${createdAt}`,
    playlistId: options?.playlistId ?? '',
    sortIndex: options?.sortIndex ?? 0,
    kind: 'composite',
    sourceId: composite.id,
    title: composite.name,
    description: getCompositeBadgeLabel(composite.stems.length),
    createdAt,
  };
};
