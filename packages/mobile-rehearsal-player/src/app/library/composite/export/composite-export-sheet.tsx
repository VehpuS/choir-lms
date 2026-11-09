import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { SegmentedControl } from '../../../components/segmented-control';
import { appTheme } from '../../../utils/theme';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import { RecordingExportProgress } from '../../recording/components/recording-export-progress';
import {
  EXPORT_COPY,
  type ExportDestination,
} from '../../recording/export/recording-export-model';
import { AllowSavingStep } from '../../sheet-music/save-to-drive/allow-saving-step';
import { describeAllowSavingStep } from '../../sheet-music/save-to-drive/allow-saving-step-model';
import {
  COMPOSITE_EXPORT_COPY,
  type CompositeExportModel,
} from './composite-export-model';
import type { useCompositeExport } from './use-composite-export';

const { colors, radius, space, type } = appTheme;

const DESTINATION_OPTIONS: ReadonlyArray<{
  label: string;
  value: ExportDestination;
}> = [
  { label: EXPORT_COPY.destinationDriveLabel, value: 'drive' },
  { label: EXPORT_COPY.destinationDownloadLabel, value: 'download' },
];

type CompositeExportSheetProps = {
  compositeName: string;
  model: CompositeExportModel;
  state: ReturnType<typeof useCompositeExport>;
  hasAskedForPermission: boolean;
  isAuthorizing: boolean;
  /** False where composites cannot run (native), so there is nothing to render with. */
  isSupported: boolean;
  onAllowSaving: () => void;
  onChooseFolder: () => void;
  onClose: () => void;
};

/**
 * The composite export dialog (composite-tracks 10.2): what is rendered, the
 * estimate, any stems left out, where to save and the file name, in the shape
 * of the recording export dialog.
 */
export const CompositeExportSheet = ({
  compositeName,
  hasAskedForPermission,
  isAuthorizing,
  isSupported,
  model,
  onAllowSaving,
  onChooseFolder,
  onClose,
  state,
}: CompositeExportSheetProps) => {
  const isDrive = state.destination === 'drive';
  const permission = describeAllowSavingStep({
    hasAskedForPermission,
    hasWriteAccess: state.canWrite,
  });
  const canChoose = !isDrive || state.canWrite;
  const canStart =
    isSupported && model.canExport && canChoose && (!isDrive || !!state.folder);

  if (state.run) {
    return (
      <BottomSheetSurface
        isVisible={true}
        onClose={state.run.step === 'running' ? state.cancel : onClose}
        scrollable={true}
        title={state.run.step === 'running' ? 'Exporting' : EXPORT_COPY.title}
      >
        <RecordingExportProgress
          onCancel={state.cancel}
          onClose={onClose}
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
            onPress={onClose}
          />
          <OutlinedActionButton
            disabled={!canStart}
            label={
              isDrive
                ? EXPORT_COPY.destinationDriveLabel
                : EXPORT_COPY.destinationDownloadLabel
            }
            onPress={() => void state.start()}
          />
        </View>
      }
      isVisible={true}
      onClose={onClose}
      scrollable={true}
      title={`${COMPOSITE_EXPORT_COPY.title} · ${compositeName}`}
    >
      <View style={styles.body}>
        <Text style={styles.hint}>{model.description}</Text>
        {model.estimateLabel ? (
          <Text style={styles.hint}>{model.estimateLabel}</Text>
        ) : null}
        {model.missingNote ? (
          <Text style={styles.warn}>{model.missingNote}</Text>
        ) : null}
        {!model.canExport ? (
          <Text style={styles.warn}>{COMPOSITE_EXPORT_COPY.allMissing}</Text>
        ) : null}
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
  // A right-to-left name in the file name must not flip the field.
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
