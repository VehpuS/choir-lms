import {
  parseCompositeTrack,
  type CompositeTrack,
} from '@org/audio-library-models';

import {
  readStoredCollection,
  writeStoredCollection,
} from './practice-repository-storage.ts';

/**
 * The `composites` collection in local library storage (composite-tracks
 * design, Migration): additive, so older data is untouched and a build that
 * does not know the collection never reads it. Records are parsed where they
 * are read, so one bad record is dropped without failing the rest.
 */

const queueByOwnerId = new Map<string, Promise<unknown>>();

/** Runs read-modify-write turns of one owner one after another, so edits never overwrite each other. */
const runSerialized = <Result>(
  ownerId: string,
  operation: () => Promise<Result>,
): Promise<Result> => {
  const previous = queueByOwnerId.get(ownerId) ?? Promise.resolve();
  const turn = previous.then(operation, operation);

  queueByOwnerId.set(
    ownerId,
    turn.then(
      () => undefined,
      () => undefined,
    ),
  );

  return turn;
};

const readComposites = async (ownerId: string): Promise<CompositeTrack[]> => {
  const stored = await readStoredCollection<unknown>('composites', ownerId);

  return stored.flatMap((entry) => parseCompositeTrack(entry) ?? []);
};

export const listStoredComposites = (
  ownerId: string,
): Promise<CompositeTrack[]> => {
  return runSerialized(ownerId, () => readComposites(ownerId));
};

/**
 * Applies a change to the owner's composites and saves the result. `change`
 * sees the latest saved list, so it can be worked out from the current value.
 */
export const updateStoredComposites = (
  ownerId: string,
  change: (composites: CompositeTrack[]) => CompositeTrack[],
): Promise<CompositeTrack[]> => {
  return runSerialized(ownerId, async () => {
    const next = change(await readComposites(ownerId));

    await writeStoredCollection('composites', ownerId, next);

    return next;
  });
};
