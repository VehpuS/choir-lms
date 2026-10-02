import { createPlaybackShapingEngine } from './playback-shaping-engine';
import {
  createPlaybackShapingSession,
  type PlaybackShapingSession,
} from './playback-shaping-session';
import type { PlaybackShapingEngine } from './playback-shaping-types';
import { createDefaultPitchShifter } from './web-pitch-shifter';
import { getSavedTrackPlayer } from '../utils/saved-track-player-interop';

export {
  canShapePitchOnPlatform,
  PITCH_UNAVAILABLE_REASON,
} from './playback-shaping-capabilities';
export { createPlaybackShapingEngine } from './playback-shaping-engine';
export type {
  ItemShapingTransform,
  PlaybackShapingSession,
  PlaybackShapingSessionState,
} from './playback-shaping-session';
export type {
  PlaybackShapingEngine,
  PlaybackShapingState,
  SpeedTransform,
} from './playback-shaping-types';

let sharedEngine: PlaybackShapingEngine | null = null;
let sharedSession: PlaybackShapingSession | null = null;

/** The app-wide engine over the shared track player (created on first use). */
export const getPlaybackShapingEngine = (): PlaybackShapingEngine => {
  sharedEngine ??= createPlaybackShapingEngine({
    pitchShifter: createDefaultPitchShifter(),
    // Resolved per call, so starting a queue (which only resets the session)
    // never needs the native player.
    player: { setRate: (rate) => getSavedTrackPlayer().setRate(rate) },
  });

  return sharedEngine;
};

/** The app-wide ambient shaping session over `getPlaybackShapingEngine`. */
export const getPlaybackShapingSession = (): PlaybackShapingSession => {
  sharedSession ??= createPlaybackShapingSession(getPlaybackShapingEngine());

  return sharedSession;
};
