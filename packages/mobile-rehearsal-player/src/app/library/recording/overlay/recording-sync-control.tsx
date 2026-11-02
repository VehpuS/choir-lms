import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { getRecordingsStore } from '../recordings-store-instance';
import { getOutputDeviceKey } from './output-device-key';
import {
  getDeviceLatency,
  saveDeviceLatency,
} from './recording-device-latency';
import {
  canUseNudgeForDevice,
  describeDeviceDefault,
  deviceLatencyFromNudge,
  formatNudge,
  stepNudge,
  SYNC_COARSE_STEP_MS,
  SYNC_FINE_STEP_MS,
  SYNC_LABEL,
  SYNC_RESET_LABEL,
  SYNC_USE_FOR_DEVICE_LABEL,
} from './recording-sync-model';
import { RecordingCalibrationSheet } from './recording-calibration-sheet';
import { RecordingSyncSheet } from './recording-sync-sheet';
import { useClickCalibration } from './use-click-calibration';
import {
  setRecordingNudge,
  useRecordingSyncState,
} from './recording-sync-store';

const { colors, space, type } = appTheme;
const SAVE_DELAY_MS = 300;
const STEPS = [
  -SYNC_COARSE_STEP_MS,
  -SYNC_FINE_STEP_MS,
  SYNC_FINE_STEP_MS,
  SYNC_COARSE_STEP_MS,
] as const;

const stepLabel = (delta: number) =>
  `${delta < 0 ? '−' : '+'}${Math.abs(delta)}`;

/** Writes the nudge to the recording shortly after it stops moving. */
const useSaveNudge = (recordingId: string | null, nudgeMs: number) => {
  const saved = useRef<{ id: string | null; nudgeMs: number } | null>(null);

  useEffect(() => {
    if (recordingId === null) {
      return;
    }

    // The first value is what the recording already holds.
    if (saved.current?.id !== recordingId) {
      saved.current = { id: recordingId, nudgeMs };

      return;
    }

    if (saved.current.nudgeMs === nudgeMs) {
      return;
    }

    const timer = setTimeout(() => {
      saved.current = { id: recordingId, nudgeMs };
      void getRecordingsStore()
        .update(recordingId, { nudgeMs })
        .catch(() => undefined);
    }, SAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [nudgeMs, recordingId]);
};

/**
 * Sync beside the balance: steps of 1 and 10 ms that sound at once and are
 * kept with the recording, a reset, and `Use for this device`, which opens the
 * sheet where the nudge becomes the default for the output in use
 * (rehearsal-recording design Decision 3).
 */
export const RecordingSyncControl = () => {
  const { nudgeMs, recordingId } = useRecordingSyncState();
  const [sheet, setSheet] = useState<'none' | 'sync' | 'calibrate'>('none');
  const [appliedLatencyMs, setAppliedLatencyMs] = useState(0);
  const [deviceKey, setDeviceKey] = useState('');
  const [deviceLatencyMs, setDeviceLatencyMs] = useState<number | null>(null);
  const calibration = useClickCalibration({
    deviceKey,
    onSaved: setDeviceLatencyMs,
  });

  useSaveNudge(recordingId, nudgeMs);

  useEffect(() => {
    if (recordingId === null) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      const [recording, key] = await Promise.all([
        getRecordingsStore().get(recordingId),
        getOutputDeviceKey(),
      ]);
      const latency = await getDeviceLatency(key);

      if (!isCancelled) {
        setAppliedLatencyMs(recording?.appliedLatencyMs ?? 0);
        setDeviceKey(key);
        setDeviceLatencyMs(latency);
      }
    })().catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, [recordingId]);

  if (recordingId === null) {
    return null;
  }

  const forDevice = { appliedLatencyMs, nudgeMs: 0 };
  const nextLatency = deviceLatencyFromNudge(forDevice, nudgeMs);
  const saveForDevice = () => {
    void saveDeviceLatency(deviceKey, nextLatency).then(() =>
      setDeviceLatencyMs(nextLatency),
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{SYNC_LABEL}</Text>
        {STEPS.slice(0, 2).map((delta) => (
          <OutlinedActionButton
            key={delta}
            accessibilityLabel={`Sync ${delta} ms`}
            label={stepLabel(delta)}
            onPress={() => setRecordingNudge(stepNudge(nudgeMs, delta))}
          />
        ))}
        <Text style={styles.value}>{formatNudge(nudgeMs)}</Text>
        {STEPS.slice(2).map((delta) => (
          <OutlinedActionButton
            key={delta}
            accessibilityLabel={`Sync ${delta} ms`}
            label={stepLabel(delta)}
            onPress={() => setRecordingNudge(stepNudge(nudgeMs, delta))}
          />
        ))}
      </View>
      <View style={styles.links}>
        <OutlinedActionButton
          disabled={nudgeMs === 0}
          label={SYNC_RESET_LABEL}
          onPress={() => setRecordingNudge(0)}
        />
        <OutlinedActionButton
          label={SYNC_USE_FOR_DEVICE_LABEL}
          onPress={() => setSheet('sync')}
        />
      </View>
      {sheet === 'sync' ? (
        <RecordingSyncSheet
          canSave={canUseNudgeForDevice(forDevice, nudgeMs, deviceLatencyMs)}
          deviceKey={deviceKey}
          nudgeMs={nudgeMs}
          onChange={setRecordingNudge}
          onClose={() => setSheet('none')}
          onMeasure={() => {
            calibration.reset();
            setSheet('calibrate');
          }}
          onSave={saveForDevice}
          saveDetail={describeDeviceDefault(deviceLatencyMs ?? nextLatency)}
        />
      ) : null}
      {sheet === 'calibrate' ? (
        <RecordingCalibrationSheet
          deviceKey={deviceKey}
          onAdjustByHand={() => {
            calibration.cancel();
            setSheet('sync');
          }}
          onCancel={calibration.cancel}
          onClose={() => {
            calibration.cancel();
            setSheet('none');
          }}
          onPlay={calibration.start}
          phase={calibration.phase}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: space.xs, paddingBottom: space.xs },
  label: { ...type.rowMeta, color: colors.textMuted },
  links: { flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  value: {
    ...type.rowTitle,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
});
