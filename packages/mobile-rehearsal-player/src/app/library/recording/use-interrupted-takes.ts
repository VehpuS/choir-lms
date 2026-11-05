import type { Recording } from '@org/audio-library-models';
import { useCallback, useEffect, useState } from 'react';

import { sortInterruptedTakes } from './recording-interrupted-model';
import { getRecordingsStore } from './recordings-store-instance';

// Read once per app launch, so a take this session's recorder starts is never
// mistaken for one a crash left behind.
const APP_STARTED_AT_MS = Date.now();

/**
 * The takes an earlier session left unfinished, one at a time. Takes under the
 * minimum length are removed on the way. `keep` finishes the current take from
 * its checkpoint, `discard` deletes it, and `later` leaves the rest for the
 * next launch.
 */
export const useInterruptedTakes = () => {
  const [queue, setQueue] = useState<Recording[]>([]);

  useEffect(() => {
    let isCancelled = false;
    const store = getRecordingsStore();

    void (async () => {
      try {
        const { discarded, offered } = sortInterruptedTakes(
          await store.listIncomplete(),
          APP_STARTED_AT_MS,
        );

        await Promise.all(discarded.map((take) => store.delete(take.id)));

        if (!isCancelled) {
          setQueue(offered);
        }
      } catch {
        // Recordings are unavailable here; there is nothing to offer.
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  const [current, ...rest] = queue;
  const advance = useCallback(() => setQueue(rest), [rest]);

  const keep = useCallback(async () => {
    if (current) {
      await getRecordingsStore()
        .recoverIncomplete(current.id)
        .catch(() => undefined);
    }

    advance();
  }, [advance, current]);
  const discard = useCallback(async () => {
    if (current) {
      await getRecordingsStore()
        .delete(current.id)
        .catch(() => undefined);
    }

    advance();
  }, [advance, current]);
  const later = useCallback(() => setQueue([]), []);

  return { current: current ?? null, discard, keep, later };
};
