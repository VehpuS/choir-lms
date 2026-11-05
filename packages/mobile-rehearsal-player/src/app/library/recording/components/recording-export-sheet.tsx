import type { Recording } from '@org/audio-library-models';
import { formatRecordingSize } from '@org/audio-library-models';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SegmentedControl } from '../../../components/segmented-control';
import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import { AllowSavingStep } from '../../sheet-music/save-to-drive/allow-saving-step';
import { describeAllowSavingStep } from '../../sheet-music/save-to-drive/allow-saving-step-model';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import {
  EXPORT_COPY,
  type ExportDestination,
  type ExportKind,
} from '../export/recording-export-model';
import type { useRecordingExport } from '../export/use-recording-export';
import {
  RecordingExportMixSection,
  type ExportMix,
} from './recording-export-mix-section';
import { RecordingExportProgress } from './recording-export-progress';

const { colors, radius, space, type } = appTheme;

const KIND_OPTIONS: ReadonlyArray<{ label: string; value: ExportKind }> = [
  { label: EXPORT_COPY.kindRecordingLabel, value: 'recording' },
  { label: EXPORT_COPY.kindMixLabel, value: 'mix' },
];
const DESTINATION_OPTIONS: ReadonlyArray<{
  label: string;
  value: ExportDestination;
}> = [
  { label: EXPORT_COPY.destinationDriveLabel, value: 'drive' },
  { label: EXPORT_COPY.destinationDownloadLabel, value: 'download' },
];

type RecordingExportSheetProps = {
  recordings: readonly Recording[];
  state: ReturnType<typeof useRecordingExport>;
  hasAskedForPermission: boolean;
  isAuthorizing: boolean;
  onAllowSaving: () => void;
  onChooseFolder: () => void;
  onClose: () => void;
  onKeepMix: (mix: ExportMix) => void;
  onPreview: (mix: ExportMix) => void;
  onPreviewMixChange: (mix: ExportMix) => void;
  onStopPreview: () => void;
};

/** The export dialog from the approved mock: what to export, where, and under what name. */
export const RecordingExportSheet = ({
  hasAskedForPermission,
  isAuthorizing,
  onAllowSaving,
  onChooseFolder,
  onClose,
  onKeepMix,
  onPreview,
  onPreviewMixChange,
  onStopPreview,
  recordings,
  state,
}: RecordingExportSheetProps) => {
  const [keepBalance, setKeepBalance] = useState(false);
  const [first] = recordings;
  const isMix = state.kind === 'mix';
  const isDrive = state.destination === 'drive';
  const permission = describeAllowSavingStep({
    hasAskedForPermission,
    hasWriteAccess: state.canWrite,
  });
  const canChoose = !isDrive || state.canWrite;
  const mixBlocked =
    isMix && (!state.checked || state.unavailableCount === recordings.length);
  const canStart = canChoose && !mixBlocked && (!isDrive || !!state.folder);
  const closeAll = () => {
    onStopPreview();
    onClose();
  };

  if (state.run) {
    return (
      <BottomSheetSurface
        isVisible={true}
        onClose={state.run.step === 'running' ? state.cancel : closeAll}
        scrollable={true}
        title={state.run.step === 'running' ? 'Exporting' : EXPORT_COPY.title}
      >
        <RecordingExportProgress
          onCancel={state.cancel}
          onClose={closeAll}
          onRetry={() => void state.retry()}
          run={state.run}
        />
      </BottomSheetSurface>
    );
  }

  return (
    <BottomSheetSurface
      footer={
        <View style={styles.actions}>
          <OutlinedActionButton
            label={EXPORT_COPY.cancelLabel}
            onPress={closeAll}
          />
          <OutlinedActionButton
            disabled={!canStart}
            label={
              state.changedCount > 0 && isMix
                ? EXPORT_COPY.exportAnywayLabel
                : isDrive
                  ? EXPORT_COPY.destinationDriveLabel
                  : EXPORT_COPY.destinationDownloadLabel
            }
            onPress={() => {
              onStopPreview();

              if (keepBalance && isMix) {
                onKeepMix({ balance: state.balance, levelDb: state.levelDb });
              }

              void state.start();
            }}
          />
        </View>
      }
      isVisible={true}
      onClose={closeAll}
      scrollable={true}
      title={
        state.isSingle && first
          ? `${EXPORT_COPY.title} ${first.name}`
          : `${EXPORT_COPY.title} ${recordings.length} recordings`
      }
    >
      <View style={styles.body}>
        <SegmentedControl
          accessibilityLabel="What to export"
          onSelect={state.setKind}
          options={KIND_OPTIONS}
          selectedValue={state.kind}
        />
        {isMix && state.changedCount > 0 ? (
          <Text style={styles.warn}>{EXPORT_COPY.changedWarning}</Text>
        ) : null}
        {isMix && state.unavailableCount > 0 ? (
          <Text style={styles.warn}>
            {state.isSingle
              ? state.availability[first?.id ?? '']?.state === 'unavailable'
                ? (state.availability[first?.id ?? ''] as { message: string })
                    .message
                : ''
              : `${state.unavailableCount} of ${recordings.length} mixes are unavailable and will be left out.`}
          </Text>
        ) : null}
        {isMix ? (
          <RecordingExportMixSection
            keepBalance={keepBalance}
            onKeepBalanceChange={setKeepBalance}
            onPreview={onPreview}
            onPreviewMixChange={onPreviewMixChange}
            recordings={recordings}
            state={state}
          />
        ) : (
          <Text style={styles.hint}>
            {`${EXPORT_COPY.recordingHint}${first && state.isSingle ? ` About ${formatRecordingSize(first.sizeBytes)}.` : ''}`}
          </Text>
        )}
        <SegmentedControl
          accessibilityLabel="Where to export"
          onSelect={state.setDestination}
          options={DESTINATION_OPTIONS}
          selectedValue={state.destination}
        />
        {isDrive && permission.state !== 'ready' ? (
          <AllowSavingStep
            isBusy={isAuthorizing}
            onAllow={onAllowSaving}
            step={permission}
          />
        ) : null}
        {isDrive && permission.state === 'ready' ? (
          <Pressable
            accessibilityLabel={
              state.folder
                ? EXPORT_COPY.changeFolderLabel
                : EXPORT_COPY.chooseFolderLabel
            }
            accessibilityRole="button"
            onPress={onChooseFolder}
            style={styles.field}
          >
            <Text style={styles.label}>{EXPORT_COPY.folderLabel}</Text>
            <View style={styles.input}>
              <Text style={styles.value}>
                {state.folder?.folderName ?? EXPORT_COPY.chooseFolderLabel}
              </Text>
              <Text style={styles.link}>{EXPORT_COPY.changeFolderLabel}</Text>
            </View>
            {state.folder ? (
              <Text style={styles.hint}>{EXPORT_COPY.lastFolderNote}</Text>
            ) : null}
          </Pressable>
        ) : null}
        {state.isSingle ? (
          <View style={styles.field}>
            <Text style={styles.label}>{EXPORT_COPY.nameLabel}</Text>
            <TextInput
              accessibilityLabel="File name"
              autoCorrect={false}
              onChangeText={state.setTypedName}
              style={[styles.nameInput, styles.leftToRight]}
              value={state.nameValue}
            />
          </View>
        ) : null}
        <Text style={styles.hint}>
          {isDrive ? EXPORT_COPY.driveNote : EXPORT_COPY.downloadNote}
        </Text>
      </View>
    </BottomSheetSurface>
  );
};

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' },
  body: { gap: space.sm },
  field: { gap: space.xxs },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hint: { ...type.rowMeta, color: colors.textMuted },
  input: {
    minHeight: space.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderChip,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
  },
  label: { ...type.rowMeta, color: colors.textMuted },
  link: { ...type.rowMeta, color: colors.accent },
  // A right-to-left track name in the file name must not flip the field.
  leftToRight: { textAlign: 'left', writingDirection: 'ltr' },
  nameInput: {
    minHeight: space.touchTarget,
    borderWidth: 1,
    borderColor: colors.borderChip,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: type.input.fontSize,
    backgroundColor: colors.surface,
  },
  value: { ...type.rowTitle, color: colors.text },
  warn: { ...type.rowMeta, color: colors.danger },
});
