import type { PlayableItem } from '@org/audio-library-models';

/**
 * True when the playing item is a composite that was in the last list of
 * composites and is not in this one: it was deleted (from the Composites view,
 * from Files, or elsewhere) while playing, so its prepared stems are gone and
 * playback should stop (composite-tracks 12.13). A composite that was never in
 * the last list (the first read has not finished) does not count.
 */
export const isActiveCompositeDeleted = (options: {
  activeItem: Pick<PlayableItem, 'kind' | 'sourceId'> | null;
  currentIds: readonly string[];
  previousIds: readonly string[];
}): boolean => {
  const { activeItem } = options;

  return (
    activeItem?.kind === 'composite' &&
    options.previousIds.includes(activeItem.sourceId) &&
    !options.currentIds.includes(activeItem.sourceId)
  );
};
