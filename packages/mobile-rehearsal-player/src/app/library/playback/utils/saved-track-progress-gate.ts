/**
 * Keeps the previous item's progress from being read as the new item's.
 *
 * From the moment a load starts until the player has reset and reported again,
 * `useProgress` still holds the last item's position and length. Anything
 * that trusted those numbers (length hydration, persisting a measured length,
 * reloading at the "current" position) acted on the wrong file (task 8.35).
 */
export type SavedTrackProgress = {
  buffered: number;
  duration: number;
  position: number;
};

export type SavedTrackProgressGate = {
  epoch: number;
  /** False while a load (or a duration probe) owns the player. */
  settled: boolean;
  /**
   * Shown in place of empty progress while the gate hides the player's own:
   * the same item is being moved to another player and is still where it was.
   */
  held?: SavedTrackProgress;
};

/** After settling, the player's next changed report is treated as current. */
export const SAVED_TRACK_PROGRESS_RELEASE_DELAY_MS = 750;

export const INITIAL_SAVED_TRACK_PROGRESS_GATE: SavedTrackProgressGate = {
  epoch: 0,
  settled: true,
};

export const EMPTY_SAVED_TRACK_PROGRESS: SavedTrackProgress = Object.freeze({
  buffered: 0,
  duration: 0,
  position: 0,
});

/**
 * Progress is empty while a load is in flight. Once it settles, progress
 * stays empty until the player reports something different from what it held
 * at that moment, or until the release delay passes (an identical report is
 * accurate by definition, so waiting longer only hides correct values).
 */
export const resolveGatedSavedTrackProgress = (options: {
  gate: SavedTrackProgressGate;
  raw: SavedTrackProgress;
  rawAtSettle: SavedTrackProgress | null;
  releasedEpoch: number;
}): SavedTrackProgress => {
  const { gate, raw, rawAtSettle, releasedEpoch } = options;

  const hidden = gate.held ?? EMPTY_SAVED_TRACK_PROGRESS;

  if (!gate.settled) {
    return hidden;
  }

  if (releasedEpoch === gate.epoch || (rawAtSettle && raw !== rawAtSettle)) {
    return raw;
  }

  return hidden;
};

const withHeld = (held: SavedTrackProgress | undefined) =>
  held ? { held } : {};

/** The epoch counter the controller and the hook share. */
export const createSavedTrackProgressGateController = (
  onChange: (gate: SavedTrackProgressGate) => void,
) => {
  let latestEpoch = INITIAL_SAVED_TRACK_PROGRESS_GATE.epoch;
  let heldByEpoch: SavedTrackProgress | undefined;

  return {
    /**
     * A load is starting; returns the epoch to hand back to `settle`. `held`
     * is what to show meanwhile when the item itself does not change.
     */
    begin(held?: SavedTrackProgress) {
      latestEpoch += 1;
      heldByEpoch = held;
      onChange({ epoch: latestEpoch, settled: false, ...withHeld(held) });

      return latestEpoch;
    },
    /** Ignored when a newer load has started, so only the last one settles. */
    settle(epoch: number) {
      if (epoch === latestEpoch) {
        onChange({ epoch, settled: true, ...withHeld(heldByEpoch) });
      }
    },
  };
};

export type SavedTrackProgressGateController = ReturnType<
  typeof createSavedTrackProgressGateController
>;
