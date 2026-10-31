const MIN_BALANCE = 0;
const MAX_BALANCE = 100;
const CENTRE_BALANCE = 50;
const FULL_GAIN = 1;

export type BalanceGains = {
  trackGain: number;
  recordingGain: number;
};

/**
 * Balance 0 is all track, 100 all recording. Both sources are at full level at
 * the centre and moving off centre only turns the far side down, so adding a
 * recording never makes the track quieter until the user asks for it.
 */
export const balanceToGains = (balance: number): BalanceGains => {
  const clamped = Number.isFinite(balance)
    ? Math.min(MAX_BALANCE, Math.max(MIN_BALANCE, balance))
    : CENTRE_BALANCE;
  const towardRecording = (clamped - CENTRE_BALANCE) / CENTRE_BALANCE;

  return {
    trackGain: towardRecording > 0 ? FULL_GAIN - towardRecording : FULL_GAIN,
    recordingGain:
      towardRecording < 0 ? FULL_GAIN + towardRecording : FULL_GAIN,
  };
};
