import { isListeningOwnerId } from '../../composite/prepared/prepared-owner';
import type { PreparedStemStore } from '../../composite/prepared/prepared-stem-types';

/**
 * The limit on audio prepared for single tracks (clear-playback-while-listening
 * design Decision 3). Composites are few and cleared by hand; a single track is
 * prepared each time one is first played with a microphone open, so this cache
 * has a size and removes the least recently played first. It is only a cache:
 * a removed track prepares again the next time it is played.
 */

const BYTES_PER_MEGABYTE = 1024 * 1024;

/** About 87 minutes of mono 16-bit audio at 48 kHz. */
export const LISTENING_AUDIO_BUDGET_BYTES = 500 * BYTES_PER_MEGABYTE;

export type ListeningAudioEntry = {
  ownerId: string;
  sizeBytes: number;
  /** Absent on a record written before uses were recorded: treated as oldest. */
  lastUsedAt?: number;
};

/**
 * The owners to remove so `incomingBytes` more fit in the budget: least
 * recently used first, never one in `keepOwnerIds` (the playing track, and the
 * one being prepared). When the kept ones alone exceed the budget, everything
 * else goes and the result is still over: the caller prepares anyway, because
 * the track being asked for matters more than the limit.
 */
export const planListeningEviction = (options: {
  entries: readonly ListeningAudioEntry[];
  budgetBytes: number;
  incomingBytes: number;
  keepOwnerIds: readonly string[];
}): string[] => {
  const keep = new Set(options.keepOwnerIds);
  const removable = options.entries
    .filter((entry) => !keep.has(entry.ownerId))
    .sort((a, b) => (a.lastUsedAt ?? 0) - (b.lastUsedAt ?? 0));
  let total =
    options.entries.reduce((sum, entry) => sum + entry.sizeBytes, 0) +
    options.incomingBytes;
  const removed: string[] = [];

  for (const entry of removable) {
    if (total <= options.budgetBytes) {
      break;
    }

    removed.push(entry.ownerId);
    total -= entry.sizeBytes;
  }

  return removed;
};

/** Removes what `planListeningEviction` chooses; composites' stems are never counted or touched. */
export const makeRoomForListeningAudio = async (
  store: Pick<PreparedStemStore, 'listComposites' | 'deleteComposite'>,
  options: {
    incomingBytes: number;
    keepOwnerIds: readonly string[];
    budgetBytes?: number;
  },
): Promise<string[]> => {
  const entries = (await store.listComposites())
    .filter((owner) => isListeningOwnerId(owner.compositeId))
    .map((owner) => ({
      ownerId: owner.compositeId,
      sizeBytes: owner.sizeBytes,
      lastUsedAt: owner.lastUsedAt,
    }));
  const removed = planListeningEviction({
    entries,
    budgetBytes: options.budgetBytes ?? LISTENING_AUDIO_BUDGET_BYTES,
    incomingBytes: options.incomingBytes,
    keepOwnerIds: options.keepOwnerIds,
  });

  for (const ownerId of removed) {
    await store.deleteComposite(ownerId);
  }

  return removed;
};
