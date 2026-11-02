import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import {
  EXPORT_COPY,
  exportFailureMessage,
  exportRunProgress,
  summarizeExportRun,
  type ExportItem,
  type ExportRun,
} from '../export/recording-export-model';

const { colors, radius, space, type } = appTheme;
const PERCENT = 100;

const describeItem = (item: ExportItem): string => {
  switch (item.status) {
    case 'pending':
      return 'Waiting';
    case 'rendering':
      return `Rendering the mix · ${Math.round(item.progress * PERCENT)}%`;
    case 'uploading':
      return `Uploading · ${Math.round(item.progress * PERCENT)}%`;
    case 'done':
      return `Saved to ${item.savedTo ?? 'Drive'}`;
    case 'skipped':
      return item.skippedMessage ?? 'Left out';
    case 'failed':
      return item.failure ? exportFailureMessage(item.failure) : 'Failed';
  }
};

type RecordingExportProgressProps = {
  run: ExportRun;
  onCancel: () => void;
  onClose: () => void;
  onRetry: () => void;
};

/** The running, cancelled, and finished views of an export, one row per recording. */
export const RecordingExportProgress = ({
  onCancel,
  onClose,
  onRetry,
  run,
}: RecordingExportProgressProps) => {
  const summary = summarizeExportRun(run);
  const isRunning = run.step === 'running';
  const isSingle = run.items.length === 1;
  const progress = exportRunProgress(run);

  return (
    <View style={styles.body}>
      {isRunning ? (
        <View
          accessibilityLabel={`Export progress ${Math.round(progress * PERCENT)} percent`}
          accessibilityRole="progressbar"
          style={styles.track}
        >
          <View style={[styles.fill, { width: `${progress * PERCENT}%` }]} />
        </View>
      ) : null}
      {run.step === 'cancelled' ? (
        <Text style={styles.note}>Export cancelled.</Text>
      ) : null}
      {!isRunning && summary.failed === 0 && run.step === 'finished' ? (
        <Text style={styles.ok}>{EXPORT_COPY.doneTitle}</Text>
      ) : null}
      {summary.failed > 0 && !isRunning ? (
        <Text style={styles.bad}>
          {isSingle
            ? EXPORT_COPY.unchangedNote
            : `${summary.failed} did not export.`}
        </Text>
      ) : null}
      {run.items.map((item) => (
        <View key={item.recordingId} style={styles.item}>
          <Text numberOfLines={1} style={styles.name}>
            {item.fileName}
          </Text>
          <Text style={item.status === 'failed' ? styles.bad : styles.detail}>
            {describeItem(item)}
          </Text>
        </View>
      ))}
      <View style={styles.actions}>
        {isRunning ? (
          <OutlinedActionButton
            label={EXPORT_COPY.cancelLabel}
            onPress={onCancel}
          />
        ) : (
          <>
            {summary.failed > 0 ? (
              <OutlinedActionButton
                label={EXPORT_COPY.tryAgainLabel}
                onPress={onRetry}
              />
            ) : null}
            <OutlinedActionButton
              label={
                summary.failed > 0
                  ? EXPORT_COPY.closeLabel
                  : EXPORT_COPY.doneLabel
              }
              onPress={onClose}
            />
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' },
  bad: { ...type.rowMeta, color: colors.danger },
  body: { gap: space.sm },
  detail: { ...type.rowMeta, color: colors.textMuted },
  fill: { height: 4, borderRadius: radius.md, backgroundColor: colors.accent },
  item: { gap: space.xxs },
  name: { ...type.rowTitle, color: colors.text },
  note: { ...type.rowMeta, color: colors.textMuted },
  ok: { ...type.rowTitle, color: colors.text },
  track: {
    height: 4,
    borderRadius: radius.md,
    backgroundColor: colors.divider,
  },
});
