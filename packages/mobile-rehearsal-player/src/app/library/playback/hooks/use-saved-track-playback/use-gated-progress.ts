import { useEffect, useRef, useState } from 'react';

import {
  INITIAL_SAVED_TRACK_PROGRESS_GATE,
  SAVED_TRACK_PROGRESS_RELEASE_DELAY_MS,
  createSavedTrackProgressGateController,
  resolveGatedSavedTrackProgress,
  type SavedTrackProgress,
  type SavedTrackProgressGate,
  type SavedTrackProgressGateController,
} from '../../utils/saved-track-progress-gate';

/**
 * Wraps the player's polled progress so a load in flight never shows the
 * previous item's position and length (8.35). Returns the gated progress and
 * the controller the playback controller opens and settles loads with.
 */
export const useGatedSavedTrackProgress = (raw: SavedTrackProgress) => {
  const [gate, setGate] = useState<SavedTrackProgressGate>(
    INITIAL_SAVED_TRACK_PROGRESS_GATE,
  );
  const [releasedEpoch, setReleasedEpoch] = useState(-1);
  const controllerRef = useRef<SavedTrackProgressGateController | null>(null);
  const settleRef = useRef<{ epoch: number; raw: SavedTrackProgress } | null>(
    null,
  );

  controllerRef.current ??= createSavedTrackProgressGateController(setGate);

  // Remember what the player held at the moment the load settled; a report
  // that differs from it came from the new item.
  if (gate.settled && settleRef.current?.epoch !== gate.epoch) {
    settleRef.current = { epoch: gate.epoch, raw };
  }

  useEffect(() => {
    if (!gate.settled || releasedEpoch === gate.epoch) {
      return;
    }

    const timer = setTimeout(() => {
      setReleasedEpoch(gate.epoch);
    }, SAVED_TRACK_PROGRESS_RELEASE_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [gate, releasedEpoch]);

  const progress = resolveGatedSavedTrackProgress({
    gate,
    raw,
    rawAtSettle:
      settleRef.current?.epoch === gate.epoch ? settleRef.current.raw : null,
    releasedEpoch,
  });

  return { progress, progressGate: controllerRef.current };
};
