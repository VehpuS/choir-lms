import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';

const pluralize = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

export const EMPTY_SAVED_TAGS_MESSAGE =
  'No tags yet. Tag a track, loop, playlist, or folder in Library to see it here.';

export const getSavedTagUsageMetadataLabel = (
  usage: RehearsalLibraryTagUsage,
) => {
  return pluralize(usage.count, 'item');
};
