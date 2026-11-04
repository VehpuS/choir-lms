import type { PlayableItem } from '@org/audio-library-models';
import type { PunchRange } from '@org/audio-mixing';
import { useCallback, type MutableRefObject } from 'react';

import { getPlaybackShapingEngine } from '../../playback/shaping';
import { getDeviceLatency } from '../overlay/recording-device-latency';
import { getOutputDeviceKey } from '../overlay/output-device-key';
import type { RecordingSession } from '../recording-session';
import {
  buildRecordingStartRequest,
  getRecordingOwnerForItem,
} from '../recording-start-request';
import { getRecordingTransport } from '../recording-transport';
import { getRecordingsStore } from '../recordings-store-instance';

const newRecordingId = () =>
  `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

type StarterInputs = {
  session: RecordingSession;
  /** The item and position as they are when a take starts, not when it was asked for. */
  latest: MutableRefObject<{ item: PlayableItem | null; positionMs: number }>;
  markersRef: MutableRefObject<readonly { name: string; positionMs: number }[]>;
};

/** What Record does, and what a punch range does at its in point. */
export const useRecordingStarter = ({
  latest,
  markersRef,
  session,
}: StarterInputs) => {
  const build = useCallback(
    async (punch?: PunchRange) => {
      const { item: current, positionMs: at } = latest.current;

      if (!current) {
        throw new Error('No track to record');
      }

      const existing = await getRecordingsStore().listByOwner(
        getRecordingOwnerForItem(current, punch),
      );
      const shaping = getPlaybackShapingEngine().getState();
      // What the user saved with `Use for this device` for the output in use;
      // recordings already made keep the compensation they were filed with.
      const deviceLatencyMs = await getDeviceLatency(
        await getOutputDeviceKey(),
      );

      return buildRecordingStartRequest({
        appliedLatencyMs: deviceLatencyMs ?? 0,
        item: current,
        positionMs: at,
        markers: markersRef.current,
        punch,
        shaping: {
          speedMultiplier:
            shaping.speed.kind === 'multiplier' ? shaping.speed.multiplier : 1,
          pitchSemitones: shaping.pitchSemitones,
          tempoSource: 'multiplier',
        },
        existingNames: existing.map((recording) => recording.name),
        id: newRecordingId(),
        createdAt: new Date().toISOString(),
        transport: getRecordingTransport() ?? undefined,
        nowMs: () => performance.now(),
      });
    },
    [latest, markersRef],
  );
  const record = useCallback(() => {
    void session.requestStart(() => build());
  }, [build, session]);
  // By the time a punch reaches its in point the explanation was shown, at arming.
  const startPunchTake = useCallback(
    (range: PunchRange) => {
      void session.requestStart(() => build(range));
    },
    [build, session],
  );

  return { record, startPunchTake };
};
