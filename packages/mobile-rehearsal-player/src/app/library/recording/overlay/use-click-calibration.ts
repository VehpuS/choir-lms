import { useCallback, useEffect, useRef, useState } from 'react';

import { getPcmSource } from '../../pitch/pcm-source';
import { getSavedTrackPlayer } from '../../playback/utils/saved-track-player-interop';
import { createClickOutput } from './click-calibration-output';
import { runClickCalibration } from './click-calibration-run';
import { saveDeviceLatency } from './recording-device-latency';
import {
  phaseFromOutcome,
  type CalibrationPhase,
} from './recording-calibration-model';

const INTRO: CalibrationPhase = { kind: 'intro' };

/**
 * Drives the calibration sheet: pauses the track (it would drown the clicks),
 * runs the clicks, and on a measurement keeps it as the default for the output
 * in use. A failed or cancelled run leaves the saved default as it was.
 */
export const useClickCalibration = (options: {
  deviceKey: string;
  onSaved: (latencyMs: number) => void;
}) => {
  const { deviceKey, onSaved } = options;
  const [phase, setPhase] = useState<CalibrationPhase>(INTRO);
  const controller = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setPhase(INTRO);
  }, []);

  // Leaving the screen mid-run stops the clicks and the microphone.
  useEffect(() => () => controller.current?.abort(), []);

  const start = useCallback(() => {
    const output = createClickOutput();

    if (!output) {
      setPhase(phaseFromOutcome({ kind: 'failed', reason: 'unavailable' }));

      return;
    }

    void Promise.resolve(getSavedTrackPlayer().pause()).catch(() => undefined);
    controller.current?.abort();

    const run = new AbortController();

    controller.current = run;
    setPhase({ kind: 'running' });

    void runClickCalibration({
      source: getPcmSource(),
      output,
      signal: run.signal,
    }).then(async (outcome) => {
      if (run.signal.aborted) {
        return;
      }

      if (outcome.kind === 'measured') {
        await saveDeviceLatency(deviceKey, outcome.latencyMs);
        onSaved(outcome.latencyMs);
      }

      setPhase(phaseFromOutcome(outcome));
    });
  }, [deviceKey, onSaved]);

  const reset = useCallback(() => setPhase(INTRO), []);

  return { phase, start, cancel, reset };
};
