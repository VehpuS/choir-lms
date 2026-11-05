import type { Recording } from '@org/audio-library-models';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { describeMixEstimate } from '../export/recording-export-estimate';
import { EXPORT_COPY } from '../export/recording-export-model';
import type { useRecordingExport } from '../export/use-recording-export';
import { RecordingBalanceSlider } from '../overlay/recording-balance-slider';
import { RecordingLevelControl } from '../overlay/recording-level-control';

const { colors, space, type } = appTheme;

/** The balance and level the dialog is setting. */
export type ExportMix = { balance: number; levelDb: number };

type RecordingExportMixSectionProps = {
  recordings: readonly Recording[];
  state: ReturnType<typeof useRecordingExport>;
  keepBalance: boolean;
  onKeepBalanceChange: (keep: boolean) => void;
  onPreview: (mix: ExportMix) => void;
  onPreviewMixChange: (mix: ExportMix) => void;
};

/**
 * The mix controls of the export dialog: balance and level with a preview, what
 * the mix will cost, and whether to keep the chosen mix as the saved one. The
 * slider carries the `Balance` label itself, so the section adds no heading.
 */
export const RecordingExportMixSection = ({
  keepBalance,
  onKeepBalanceChange,
  onPreview,
  onPreviewMixChange,
  recordings,
  state,
}: RecordingExportMixSectionProps) => {
  const [first] = recordings;

  return (
    <View style={styles.field}>
      {state.isSingle ? (
        <View style={styles.previewRow}>
          <OutlinedActionButton
            icon="play"
            label={EXPORT_COPY.previewLabel}
            onPress={() =>
              onPreview({ balance: state.balance, levelDb: state.levelDb })
            }
          />
        </View>
      ) : null}
      <RecordingBalanceSlider
        onChange={(next) => {
          state.setBalance(next);
          onPreviewMixChange({ balance: next, levelDb: state.levelDb });
        }}
        value={state.balance}
      />
      {first && state.isSingle ? (
        <RecordingLevelControl
          levelDb={state.levelDb}
          onChange={(next) => {
            state.setLevelDb(next);
            onPreviewMixChange({ balance: state.balance, levelDb: next });
          }}
          recordingId={first.id}
        />
      ) : (
        <Text style={styles.hint}>{EXPORT_COPY.bulkLevelHint}</Text>
      )}
      <Text style={styles.hint}>{EXPORT_COPY.mixHint}</Text>
      <Text style={styles.hint}>{describeMixEstimate(recordings)}</Text>
      {state.isSingle ? (
        <View style={styles.keepRow}>
          <Text style={styles.keepLabel}>{EXPORT_COPY.keepBalanceLabel}</Text>
          <Switch
            accessibilityLabel={EXPORT_COPY.keepBalanceLabel}
            onValueChange={onKeepBalanceChange}
            value={keepBalance}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: { gap: space.xxs },
  hint: { ...type.rowMeta, color: colors.textMuted },
  keepLabel: { ...type.rowTitle, color: colors.text, flex: 1 },
  keepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: space.touchTarget,
  },
  previewRow: { flexDirection: 'row', justifyContent: 'flex-end' },
});
