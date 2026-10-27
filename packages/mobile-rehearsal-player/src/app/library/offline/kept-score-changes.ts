import type { DriveAudioSource } from '@org/audio-library-models';

const KEY_SEPARATOR = '|';

/** The Drive score files a track would keep, as one comparable key. */
export const getKeepableScoreKey = (source: DriveAudioSource): string => {
  return (source.sheetMusic ?? [])
    .flatMap(({ location }) => {
      return location.kind === 'drive' ? [location.fileId] : [];
    })
    .sort()
    .join(KEY_SEPARATOR);
};

/**
 * The tracks whose Drive score files changed since `previousKeys` and that
 * are kept offline, so the new scores are kept with them. `previousKeys` is
 * updated; a track seen for the first time only records its key (nothing
 * changed, the library was just loaded).
 */
export const findSourcesWithNewScores = (
  sources: readonly DriveAudioSource[],
  previousKeys: Map<string, string>,
  isKept: (driveFileId: string) => boolean,
): DriveAudioSource[] => {
  const changed: DriveAudioSource[] = [];

  for (const source of sources) {
    const key = getKeepableScoreKey(source);
    const previous = previousKeys.get(source.driveFileId);

    previousKeys.set(source.driveFileId, key);

    if (previous !== undefined && previous !== key && key.length > 0) {
      if (isKept(source.driveFileId)) {
        changed.push(source);
      }
    }
  }

  return changed;
};
