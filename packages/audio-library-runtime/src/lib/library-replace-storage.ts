import type {
  CompositeTrack,
  DriveAudioSource,
  NamedLoop,
  Playlist,
  RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

/**
 * Replaces a whole library without ever leaving it half replaced (design
 * Decision 8). AsyncStorage has no transaction across keys, so the new values
 * are staged under `:staging` keys, one marker write commits the swap, and the
 * live keys are then overwritten with the tree last. If the app dies:
 *   - before the marker, the staged values are stray and are deleted (the old
 *     library is untouched);
 *   - after the marker, the swap is finished on the next read.
 * The live keys are written from the staged copies, which are removed only
 * afterwards, so finishing a swap twice is harmless.
 */

export type ReplacementLibraryState = {
  sources: DriveAudioSource[];
  loops: NamedLoop[];
  playlists: Playlist[];
  composites: CompositeTrack[];
  tree: RehearsalLibraryFileTree;
};

const asyncStorage = AsyncStorage as unknown as AsyncStorageStatic;

const STAGING_SUFFIX = ':staging';
const KEY_PREFIX = 'choirlms:practice:';
/** The tree is last so a reader never sees a tree pointing at missing entities. */
const SWAP_ORDER = [
  'sources',
  'loops',
  'playlists',
  'composites',
  'library-tree',
] as const;

const liveKey = (name: (typeof SWAP_ORDER)[number], ownerId: string) =>
  `${KEY_PREFIX}${name}:${ownerId}`;
const markerKey = (ownerId: string) => `${KEY_PREFIX}replace-marker:${ownerId}`;

const checkedOwners = new Set<string>();

const finishSwap = async (ownerId: string) => {
  for (const name of SWAP_ORDER) {
    const staged = await asyncStorage.getItem(
      liveKey(name, ownerId) + STAGING_SUFFIX,
    );

    // Already copied (and its staging removed) by an earlier, interrupted run.
    if (staged === null) {
      continue;
    }

    await asyncStorage.setItem(liveKey(name, ownerId), staged);
    await asyncStorage.removeItem(liveKey(name, ownerId) + STAGING_SUFFIX);
  }

  await asyncStorage.removeItem(markerKey(ownerId));
};

const discardStaging = async (ownerId: string) => {
  for (const name of SWAP_ORDER) {
    const stagingKey = liveKey(name, ownerId) + STAGING_SUFFIX;

    // Read first: almost always nothing is staged, and then nothing is written.
    if ((await asyncStorage.getItem(stagingKey)) !== null) {
      await asyncStorage.removeItem(stagingKey);
    }
  }
};

/**
 * Finishes or rolls back an interrupted replace. Reads call this before
 * touching the library; after the first check per owner it costs nothing.
 */
export const recoverInterruptedLibraryReplace = async (ownerId: string) => {
  if (checkedOwners.has(ownerId)) {
    return;
  }

  checkedOwners.add(ownerId);

  if ((await asyncStorage.getItem(markerKey(ownerId))) !== null) {
    await finishSwap(ownerId);

    return;
  }

  await discardStaging(ownerId);
};

/** Forgets what was checked, for tests that reset storage between cases. */
export const resetLibraryReplaceRecoveryChecks = () => {
  checkedOwners.clear();
};

export type LibraryReplaceHooks = {
  /** Called after the marker is written, before the swap; tests use it to simulate a crash. */
  afterCommit?: () => Promise<void> | void;
};

export const replaceLibraryStorage = async (
  ownerId: string,
  state: ReplacementLibraryState,
  hooks?: LibraryReplaceHooks,
) => {
  const priorValue = await asyncStorage.getItem(liveKey('sources', ownerId));
  const priorSources = priorValue
    ? (JSON.parse(priorValue) as DriveAudioSource[])
    : [];
  const nextValues: Record<(typeof SWAP_ORDER)[number], unknown> = {
    sources: state.sources,
    loops: state.loops,
    playlists: state.playlists,
    composites: state.composites,
    'library-tree': state.tree,
  };

  // Anything left over from an earlier attempt is stale.
  await recoverInterruptedLibraryReplace(ownerId);

  for (const name of SWAP_ORDER) {
    await asyncStorage.setItem(
      liveKey(name, ownerId) + STAGING_SUFFIX,
      JSON.stringify(nextValues[name]),
    );
  }

  // The single write that commits the replacement.
  await asyncStorage.setItem(
    markerKey(ownerId),
    JSON.stringify({ startedAt: new Date().toISOString() }),
  );
  await hooks?.afterCommit?.();
  await finishSwap(ownerId);

  const keptIds = new Set(state.sources.map((source) => source.id));

  return {
    /** Tracks the old library had and the new one does not, so the caller can drop their caches. */
    removedSourceIds: priorSources
      .map((source) => source.id)
      .filter((id) => !keptIds.has(id)),
  };
};
