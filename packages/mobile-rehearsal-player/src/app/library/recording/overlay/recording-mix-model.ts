import { clampRecordingBalance } from '@org/audio-library-models';
import { balanceToGains } from '@org/audio-mixing';

/**
 * The levels behind the balance control (rehearsal-recording design Decision
 * 5). Balance only sets how the track and the recording compare; the user's
 * volume still decides how loud the pair is, so both sides are scaled by it.
 */

export const BALANCE_MIN_LABEL = 'Track';
export const BALANCE_MAX_LABEL = 'Mine';
export const BALANCE_CONTROL_LABEL = 'Balance between track and recording';

const CENTRE = 50;

export type RecordingMix = {
  /** The track's share alone, to multiply by the volume wherever it is set. */
  volumeShare: number;
  /** The track's volume: its share times the playback volume. */
  trackVolume: number;
  /** Level of the recording's own output. */
  recordingLevel: number;
};

export const getRecordingMix = (options: {
  balance: number;
  /** The playback volume, 0 to 1. */
  volumeLevel: number;
}): RecordingMix => {
  const { recordingGain, trackGain } = balanceToGains(
    clampRecordingBalance(options.balance),
  );

  return {
    volumeShare: trackGain,
    trackVolume: trackGain * options.volumeLevel,
    recordingLevel: recordingGain * options.volumeLevel,
  };
};

/** What a screen reader says for the slider: the extremes and the centre by name. */
export const describeBalance = (balance: number): string => {
  const value = clampRecordingBalance(balance);

  if (value <= 0) {
    return 'Track only';
  }

  if (value >= 100) {
    return 'Recording only';
  }

  return value === CENTRE ? 'Even' : `${value} out of 100 toward the recording`;
};
