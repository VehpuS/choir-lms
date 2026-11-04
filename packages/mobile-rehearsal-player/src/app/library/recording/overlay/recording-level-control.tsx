import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { getRecordingsStore } from '../recordings-store-instance';
import { RecordingLevelSlider } from './recording-level-slider';
import { RecordingMixLink } from './recording-mix-link';
import { NORMALIZE_LABEL, NORMALIZE_MESSAGES } from './recording-level-model';
import { normalizeRecording } from './recording-normalize';

const { colors, space, type } = appTheme;

type RecordingLevelControlProps = {
  recordingId: string;
  levelDb: number;
  onChange: (levelDb: number) => void;
  /** Other actions for the same line, to the left of `Normalize` (`Save as default`). */
  extraActions?: ReactNode;
};

/**
 * The recording's level (rehearsal-recording design Decision 21): a slider and
 * `Normalize`, which measures the stored recording and sets the level that puts
 * its loudest sample just under full scale. Normalize only suggests: the slider
 * can be moved afterwards, and its message stays until it is.
 */
export const RecordingLevelControl = ({
  extraActions,
  levelDb,
  onChange,
  recordingId,
}: RecordingLevelControlProps) => {
  const [message, setMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scan = useRef<{ aborted: boolean } | null>(null);

  // A scan for a recording that is no longer here is not wanted any more.
  useEffect(
    () => () => {
      if (scan.current) {
        scan.current.aborted = true;
      }
    },
    [recordingId],
  );

  const change = (next: number) => {
    setMessage(null);
    onChange(next);
  };

  const normalize = async () => {
    const signal = { aborted: false };

    scan.current = signal;
    setIsScanning(true);
    setMessage(NORMALIZE_MESSAGES.scanning);

    const outcome = await normalizeRecording(
      recordingId,
      { getWavBlob: (id) => getRecordingsStore().getWavBlob(id) },
      signal,
    );

    if (signal.aborted) {
      return;
    }

    setIsScanning(false);
    setMessage(outcome.status === 'aborted' ? null : (outcome.message ?? null));

    if (outcome.status === 'set') {
      onChange(outcome.levelDb);
    }
  };

  return (
    <View>
      <RecordingLevelSlider onChange={change} value={levelDb} />
      <View style={styles.actions}>
        {message ? (
          <Text accessibilityLiveRegion="polite" style={styles.message}>
            {message}
          </Text>
        ) : null}
        {extraActions}
        <RecordingMixLink
          disabled={isScanning}
          label={NORMALIZE_LABEL}
          onPress={() => void normalize()}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    justifyContent: 'flex-end',
    paddingBottom: space.xs,
  },
  message: { ...type.rowMeta, color: colors.textMuted, flex: 1 },
});
