import {
  IDLE_PUNCH,
  createPunchController,
  type PunchController,
  type PunchRange,
  type PunchState,
} from '@org/audio-mixing';
import { useSyncExternalStore } from 'react';

import { getPlaybackShapingEngine } from '../../playback/shaping';
import { getSavedTrackPlayer } from '../../playback/utils/saved-track-player-interop';
import type { RecordingStopReason } from '../recorder-types';
import { getRecordingTransport } from '../recording-transport';
import { createPunchRecorder } from './punch-recorder';

const MS_PER_SECOND = 1000;
const listeners = new Set<() => void>();
let controller: PunchController | null = null;
let unsubscribe: (() => void) | null = null;
let sheetOpen = false;

const publish = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const FINISHED_PHASES: ReadonlySet<PunchState['phase']> = new Set([
  'stopped-at-out',
  'disarmed',
  'stopped-early',
]);

export const getPunchState = (): PunchState =>
  controller?.getState() ?? IDLE_PUNCH;

const getPunchPhase = () => getPunchState().phase;

const release = () => {
  unsubscribe?.();
  controller?.dispose();
  unsubscribe = null;
  controller = null;
  publish();
};

const currentRate = () => {
  const { speed } = getPlaybackShapingEngine().getState();

  return speed.kind === 'multiplier' ? speed.multiplier : 1;
};

/** What a punch range does to the recording session. */
export type PunchTake = {
  start: () => void;
  stop: (reason: RecordingStopReason) => void;
};

/** Arms a punch range against the playing track; `take` starts and stops the recording at its points. */
export const armPunch = (range: PunchRange, take: PunchTake): boolean => {
  const transport = getRecordingTransport();

  if (!transport) {
    return false;
  }

  release();

  const player = getSavedTrackPlayer();

  controller = createPunchController({
    getRate: currentRate,
    playback: {
      pause: () => void Promise.resolve(player.pause()).catch(() => undefined),
      play: () => void Promise.resolve(player.play()).catch(() => undefined),
      seek: (ms) =>
        void Promise.resolve(player.seekTo(ms / MS_PER_SECOND)).catch(
          () => undefined,
        ),
    },
    recorder: createPunchRecorder({
      getPhase: getPunchPhase,
      start: take.start,
      stop: take.stop,
    }),
    transport,
  });
  unsubscribe = controller.subscribe(() => {
    if (controller && FINISHED_PHASES.has(controller.getState().phase)) {
      release();

      return;
    }

    publish();
  });
  controller.arm(range);

  return true;
};

export const playPunchFromPreRoll = () => controller?.playFromPreRoll();

/** `Disarm`, at any time. */
export const disarmPunch = () => {
  controller?.stop();
  release();
};

export const usePunchState = (): PunchState =>
  useSyncExternalStore(subscribe, getPunchState, () => IDLE_PUNCH);

export const openPunchSheet = () => {
  sheetOpen = true;
  publish();
};

export const closePunchSheet = () => {
  sheetOpen = false;
  publish();
};

export const usePunchSheetOpen = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => sheetOpen,
    () => false,
  );
