import {
  createSourceLyrics,
  type DriveAudioSource,
  type SourceLyricsOrigin,
} from '@org/audio-library-models';
import { omit } from 'es-toolkit/compat';

import { writeStoredCollection } from './practice-repository-storage';

type LyricsRepository = {
  listSources(ownerId: string): Promise<DriveAudioSource[]>;
};

export type SourceLyricsChange = {
  origin: SourceLyricsOrigin;
  text: string;
};

/**
 * Updates only a track's `lyrics` field. An empty body removes the field, and
 * an unknown track id leaves the library untouched.
 */
export const saveSourceLyricsToRepository = async (
  repository: LyricsRepository,
  ownerId: string,
  sourceId: string,
  change: SourceLyricsChange | null,
): Promise<DriveAudioSource[]> => {
  const sources = await repository.listSources(ownerId);

  if (!sources.some((source) => source.id === sourceId)) {
    return sources;
  }

  const lyrics = change
    ? createSourceLyrics({ ...change, updatedAt: new Date().toISOString() })
    : undefined;
  const nextSources = sources.map((source) => {
    if (source.id !== sourceId) {
      return source;
    }

    const sourceWithoutLyrics = omit(source, ['lyrics']);

    return lyrics ? { ...sourceWithoutLyrics, lyrics } : sourceWithoutLyrics;
  });

  await writeStoredCollection('sources', ownerId, nextSources);

  return nextSources;
};
