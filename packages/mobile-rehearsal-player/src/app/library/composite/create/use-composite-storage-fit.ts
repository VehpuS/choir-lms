import {
  checkCompositeStorageFit,
  type StorageEstimator,
  type StorageFit,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';

import type { CreateSheetTrack } from './create-sheet-model';

/**
 * The rate prepared stems are estimated at. The audio context is not created
 * until the user presses play, so the create sheet counts at the common 48 kHz
 * (the larger of the usual rates, so it errs towards warning early).
 */
export const ESTIMATE_SAMPLE_RATE = 48_000;

const getBrowserEstimator = (): StorageEstimator | undefined => {
  const storage = (
    globalThis as {
      navigator?: { storage?: { estimate?: StorageEstimator['estimate'] } };
    }
  ).navigator?.storage;

  return storage?.estimate
    ? {
        estimate: () =>
          storage.estimate?.() as ReturnType<StorageEstimator['estimate']>,
      }
    : undefined;
};

/** Whether the selected tracks' stems would fit; `unknown` until the browser answers. */
export const useCompositeStorageFit = (
  tracks: readonly CreateSheetTrack[],
  estimator: StorageEstimator | undefined = getBrowserEstimator(),
  /** Changes when room was freed, so the estimate is read again (task 9.2). */
  recheckToken = 0,
): StorageFit => {
  const [fit, setFit] = useState<StorageFit>('unknown');
  // A string key, so the effect reruns when lengths change but not on every render.
  const lengthsKey = tracks.map((track) => track.durationMs ?? '').join(',');

  useEffect(() => {
    let current = true;

    void checkCompositeStorageFit(
      tracks.map((track) => ({ durationMs: track.durationMs ?? 0 })),
      ESTIMATE_SAMPLE_RATE,
      estimator,
    ).then((result) => {
      if (current) {
        setFit(result.fit);
      }
    });

    return () => {
      current = false;
    };
    // `tracks` is represented by its lengths.
  }, [estimator, lengthsKey, recheckToken]);

  return fit;
};
