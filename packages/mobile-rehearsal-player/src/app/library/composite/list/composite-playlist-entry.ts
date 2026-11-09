import {
  resolveCompositePlayableItem,
  type CompositeLibrary,
  type CompositeTrack,
  type PlaylistEntry,
} from '@org/audio-library-models';

import { buildCompositeLibraryRow } from './composites-library-model';

/**
 * How a playlist entry of kind `composite` reads and whether it plays
 * (composite-tracks 7.2). The entry names the composite by id; one that was
 * deleted or whose stems are all gone says so and is skipped when playing,
 * like a deleted recording.
 */

export const COMPOSITE_DELETED_LABEL = 'Composite deleted';

type EntryComposite = Pick<CompositeTrack, 'id' | 'name' | 'stems'> &
  Partial<Pick<CompositeTrack, 'createdAt' | 'markers'>>;

const findComposite = <Composite extends { id: string }>(
  entry: Pick<PlaylistEntry, 'sourceId'>,
  composites: readonly Composite[],
) => composites.find(({ id }) => id === entry.sourceId);

/** `Composite • 4 stems • 2:48`, or why it cannot play. */
export const getCompositeEntryLabel = (options: {
  entry: Pick<PlaylistEntry, 'sourceId'>;
  composites: readonly EntryComposite[];
  library: CompositeLibrary;
}): string => {
  const composite = findComposite(options.entry, options.composites);

  if (!composite) {
    return COMPOSITE_DELETED_LABEL;
  }

  const row = buildCompositeLibraryRow(composite, options.library);

  return [row.badge.replace(' · ', ' • '), row.meta.replace(/ · /g, ' • ')]
    .filter(Boolean)
    .join(' • ');
};

/** Plays while the composite exists and at least one stem can still sound. */
export const isCompositeEntryPlayable = (options: {
  entry: Pick<PlaylistEntry, 'sourceId'>;
  composites: readonly CompositeTrack[];
  library: CompositeLibrary;
}): boolean => {
  const composite = findComposite(options.entry, options.composites);

  return (
    composite !== undefined &&
    resolveCompositePlayableItem(composite, options.library) !== null
  );
};
