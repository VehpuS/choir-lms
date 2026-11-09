import type { PracticeRepository } from '@org/audio-library-runtime';
import type { LibraryBundleInput } from '@org/audio-library-runtime';

/** Reads every collection the bundles are built from, as of now. */
export const loadCanonicalLibraryState = async (
  repository: Pick<
    PracticeRepository,
    | 'listComposites'
    | 'listLibraryFileTree'
    | 'listLoops'
    | 'listPlaylists'
    | 'listSources'
  >,
  ownerId: string,
): Promise<LibraryBundleInput> => {
  const [sources, loops, playlists, composites, tree] = await Promise.all([
    repository.listSources(ownerId),
    repository.listLoops(ownerId),
    repository.listPlaylists(ownerId),
    repository.listComposites(ownerId),
    repository.listLibraryFileTree(ownerId),
  ]);

  return { sources, loops, playlists, composites, tree };
};
