/**
 * A multiplier on the track's own volume, set by whatever mixes another sound
 * over it (a playing recording's balance). The volume slider still sets the
 * playback volume; the player is given that volume times this gain, so the
 * two never fight over the one media element.
 */
let trackGain = 1;

export const getTrackGain = (): number => trackGain;

export const setTrackGain = (next: number) => {
  trackGain = Number.isFinite(next) ? Math.min(1, Math.max(0, next)) : 1;
};
