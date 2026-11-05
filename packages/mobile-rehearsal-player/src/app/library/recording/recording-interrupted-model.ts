import {
  formatRecordingDuration,
  MIN_RECORDING_DURATION_MS,
  type Recording,
} from '@org/audio-library-models';

/**
 * Sorts the takes a crash or a closed tab left unfinished into those worth
 * offering back and those too short to keep (the same one-second floor a
 * normal take has, rehearsal-recording design Decision 8). A take created
 * after the app started belongs to this session's own recorder, not to a
 * crash, so it is never offered.
 */
export type InterruptedTakes = {
  /** Offered to the user, oldest first. */
  offered: Recording[];
  /** Under the minimum length; removed without asking. */
  discarded: Recording[];
};

export const sortInterruptedTakes = (
  incomplete: readonly Recording[],
  appStartedAtMs: number,
): InterruptedTakes => {
  const fromEarlierSessions = incomplete.filter(
    (take) => Date.parse(take.createdAt) < appStartedAtMs,
  );

  return {
    discarded: fromEarlierSessions.filter(
      (take) => take.durationMs < MIN_RECORDING_DURATION_MS,
    ),
    offered: fromEarlierSessions
      .filter((take) => take.durationMs >= MIN_RECORDING_DURATION_MS)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
  };
};

export const describeInterruptedTake = (take: Recording): string =>
  `A take of ${formatRecordingDuration(take.durationMs)} on ${take.source.name} was interrupted. Keep what was saved? The last few seconds may be missing.`;
