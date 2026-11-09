import {
  buildCompositeSheetMusic,
  describeSheetMusicUse,
  findCompositeSheetMusicOwner,
  type CompositeTrack,
  type DriveAudioSource,
  type SheetMusicSource,
} from '@org/audio-library-models';

/**
 * The combined sheet music of a composite (composite-tracks 8.1): every stem's
 * sources plus those added to the composite, each file once with a line saying
 * who uses it. A file a stem links is edited on that stem's track, so the
 * manager offers rename and remove only for files added to the composite.
 */

export const COMPOSITE_SHEET_MUSIC_ADD_LABEL =
  'Add sheet music to this composite';
export const COMPOSITE_SHEET_MUSIC_EMPTY_MESSAGE =
  'No sheet music yet. Add a score or a part for this composite, or link it on a stem’s track.';
export const COMPOSITE_SHEET_MUSIC_LIMIT_MESSAGE =
  'A composite can have up to 10 sheet music sources of its own. Remove one to add another.';

export type CompositeSheetMusicWriteTarget =
  | { kind: 'composite' }
  | { kind: 'track'; trackId: string };

export type CompositeSheetMusicView = {
  /** The union, in list order, ready for the manager and the viewer. */
  sources: SheetMusicSource[];
  /** The line under each row, keyed by source id. */
  useLines: ReadonlyMap<string, string>;
  /** Sources the composite can rename and remove (those added to it). */
  editableIds: ReadonlySet<string>;
  /** How many sources the composite holds itself, for the per-record limit. */
  ownCount: number;
  /** Where an edit to a source id is written; undefined for an unknown id. */
  resolveWriteTarget: (
    sheetMusicId: string,
  ) => CompositeSheetMusicWriteTarget | undefined;
};

type StemTrack = Pick<DriveAudioSource, 'id' | 'sheetMusic'>;

export const buildCompositeSheetMusicView = (
  composite: Pick<CompositeTrack, 'stems' | 'sheetMusic'>,
  tracks: readonly StemTrack[],
): CompositeSheetMusicView => {
  const stems = composite.stems.map((stem) => ({
    id: stem.id,
    name: stem.name,
    sheetMusic: tracks.find((track) => track.id === stem.trackId)?.sheetMusic,
  }));
  const own = composite.sheetMusic ?? [];
  const entries = buildCompositeSheetMusic(stems, own);
  const ownIds = new Set(own.map(({ id }) => id));

  return {
    sources: entries.map((entry) => entry.source),
    useLines: new Map(
      entries.map((entry) => [entry.source.id, describeSheetMusicUse(entry)]),
    ),
    editableIds: new Set(
      entries
        .map((entry) => entry.source.id)
        .filter((sourceId) => ownIds.has(sourceId)),
    ),
    ownCount: own.length,
    resolveWriteTarget: (sheetMusicId) => {
      const owner = findCompositeSheetMusicOwner(stems, own, sheetMusicId);

      if (owner?.kind !== 'stem') {
        return owner;
      }

      const trackId = composite.stems.find(
        (stem) => stem.id === owner.stemId,
      )?.trackId;

      return trackId ? { kind: 'track', trackId } : undefined;
    },
  };
};

/** What the viewer and the Save to Drive sheet need to know about the composite. */
export const resolveCompositeSheetMusicOwner = (
  composite: Pick<CompositeTrack, 'name' | 'stems'>,
  tracks: readonly Pick<DriveAudioSource, 'id' | 'sourceLocation'>[],
) => ({
  name: composite.name,
  // A file saved to Drive from here goes beside the first stem's audio.
  sourceLocation: tracks.find(({ id }) =>
    composite.stems.some((stem) => stem.trackId === id),
  )?.sourceLocation,
});
