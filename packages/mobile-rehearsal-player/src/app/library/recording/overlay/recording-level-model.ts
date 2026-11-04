import {
  MAX_RECORDING_LEVEL_DB,
  MIN_RECORDING_LEVEL_DB,
  clampRecordingBalance,
  clampRecordingLevelDb,
} from '@org/audio-library-models';

/**
 * The copy and rules behind the level control (rehearsal-recording design
 * Decision 21). Level is how loud the recording is against the track, apart
 * from balance, which only says which side is favoured.
 */

export const LEVEL_CONTROL_LABEL = 'Recording level';
export const LEVEL_HEADING = 'Level';
export const NORMALIZE_LABEL = 'Normalize';
export const LEVEL_MIN_DB = MIN_RECORDING_LEVEL_DB;
export const LEVEL_MAX_DB = MAX_RECORDING_LEVEL_DB;
export const LEVEL_STEP_DB = 0.5;
export const SAVE_MIX_LABEL = 'Save as default';

export const NORMALIZE_MESSAGES = {
  scanning: 'Measuring the loudest part…',
  silent: 'Nothing to raise: this recording has no sound.',
  tooQuiet: 'Raised as far as it goes. It is still quiet.',
  unreadable: 'Could not read the recording.',
} as const;

const MINUS = '−';

/** `+6 dB`, `0 dB` or `−3 dB`, with half decibels shown. */
export const formatLevelDb = (levelDb: number): string => {
  const value = clampRecordingLevelDb(levelDb);

  if (value === 0) {
    return '0 dB';
  }

  return `${value > 0 ? '+' : MINUS}${Math.abs(value)} dB`;
};

/** What a screen reader says for the slider. */
export const describeLevel = (levelDb: number): string => {
  const value = clampRecordingLevelDb(levelDb);

  if (value === 0) {
    return 'As recorded';
  }

  return `${Math.abs(value)} decibels ${value > 0 ? 'louder' : 'quieter'}`;
};

/** Whether the live balance or level differs from what is saved, so keeping them means something. */
export const canSaveMixAsDefault = (
  live: { balance: number; levelDb: number },
  saved: { balance: number; levelDb: number },
): boolean =>
  clampRecordingBalance(live.balance) !==
    clampRecordingBalance(saved.balance) ||
  clampRecordingLevelDb(live.levelDb) !== clampRecordingLevelDb(saved.levelDb);
