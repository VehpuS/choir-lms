import type { Recording } from '@org/audio-library-models';
import { useCallback } from 'react';

import {
  setRecordingMixBalanceFor,
  setRecordingMixLevelFor,
  syncRecordingMixSaved,
} from '../overlay/recording-mix-store';
import { requestRecordingPreview } from '../overlay/recording-preview-request';
import { getRecordingsStore } from '../recordings-store-instance';

/** The balance and level the save sheet is setting. */
export type SavedMix = { balance: number; levelDb: number };

/**
 * What the save sheet does with a take's balance and level: hears them (a
 * preview over the track), follows them while one plays, and keeps them with
 * the recording when the sheet is done.
 */
export const useSavedRecordingMix = (saved: Recording | undefined) => {
  const setSavedMix = useCallback(
    (mix: SavedMix) => {
      if (
        saved &&
        (mix.balance !== saved.balance || mix.levelDb !== (saved.levelDb ?? 0))
      ) {
        void getRecordingsStore()
          .update(saved.id, mix)
          .then(() => syncRecordingMixSaved(saved.id, mix));
      }
    },
    [saved],
  );
  const preview = useCallback(
    (mix: SavedMix) => {
      if (saved) {
        requestRecordingPreview({
          kind: 'play',
          recordingId: saved.id,
          ...mix,
        });
      }
    },
    [saved],
  );
  const changeMix = useCallback(
    (mix: SavedMix) => {
      if (saved) {
        setRecordingMixBalanceFor(saved.id, mix.balance);
        setRecordingMixLevelFor(saved.id, mix.levelDb);
      }
    },
    [saved],
  );
  const stopPreview = useCallback(() => {
    if (saved) {
      requestRecordingPreview({ kind: 'stop', recordingId: saved.id });
    }
  }, [saved]);

  return { changeMix, preview, setSavedMix, stopPreview };
};
