import { createPlaybackShapingEngine } from './playback-shaping-engine';
import type { PlaybackShapingEngine } from './playback-shaping-types';
import { createDefaultPitchShifter } from './web-pitch-shifter';
import { getSavedTrackPlayer } from '../utils/saved-track-player-interop';

export {
  canShapePitchOnPlatform,
  PITCH_UNAVAILABLE_REASON,
} from './playback-shaping-capabilities';
export { createPlaybackShapingEngine } from './playback-shaping-engine';
export type {
  PlaybackShapingEngine,
  PlaybackShapingState,
  SpeedTransform,
} from './playback-shaping-types';

let sharedEngine: PlaybackShapingEngine | null = null;

/** The app-wide engine over the shared track player (created on first use). */
export const getPlaybackShapingEngine = (): PlaybackShapingEngine => {
  sharedEngine ??= createPlaybackShapingEngine({
    pitchShifter: createDefaultPitchShifter(),
    player: getSavedTrackPlayer(),
  });

  return sharedEngine;
};
