import type { MarkerListFilter } from '@org/audio-library-models';
import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { appTheme } from '../../../../utils/theme';
import { CenteredDialogCard } from '../../../components/centered-dialog-card';
import { MarkersSheet } from '../../../markers/components/markers-sheet';
import type { MarkersSheetModel } from '../../../markers/components/markers-sheet/model';
import { setMarkersFilter } from '../../../markers/markers-filter-preference';
import type { LoopBuilderBoundary } from '../../utils/saved-loop-view-model';

const noop = () => undefined;

type LoopEditorMarkerControlsProps = {
  armed: LoopBuilderBoundary | null;
  onOpenPicker: () => void;
};

/** `Pick marker` while a card is armed. */
export const LoopEditorMarkerControls = ({
  armed,
  onOpenPicker,
}: LoopEditorMarkerControlsProps) => {
  return armed ? (
    <OutlinedActionButton
      fill
      icon="flag-outline"
      label={`Pick marker for ${armed}`}
      onPress={onOpenPicker}
    />
  ) : null;
};

type LoopEditorMarkerPickerProps = {
  durationMs?: number;
  filter: MarkerListFilter;
  model: MarkersSheetModel;
  onClose: () => void;
  onPick: (positionMs: number, name: string) => void;
};

/**
 * The markers list as a picker: rows are only tapped. Adding, editing, and
 * making loops are not offered here because the model carries no row actions
 * and the sheet's write handlers are inert.
 */
export const LoopEditorMarkerPicker = ({
  durationMs,
  filter,
  model,
  onClose,
  onPick,
}: LoopEditorMarkerPickerProps) => {
  return (
    <MarkersSheet
      durationMs={durationMs}
      filter={filter}
      model={model}
      onAddHere={() => Promise.resolve({ error: '' })}
      onClose={onClose}
      onCreateLoops={noop}
      onDelete={() => Promise.resolve(undefined)}
      onFilterChange={setMarkersFilter}
      onJump={(row) => {
        onPick(row.positionMs, row.name);
      }}
      onKeepAsMarker={noop}
      onMakeLoop={noop}
      onMove={noop}
      onOpenLoop={noop}
      onRename={noop}
      onRestore={noop}
    />
  );
};

type LoopEditorPickConflictDialogProps = {
  fixLabel: string | null;
  message: string;
  onCancel: () => void;
  onPickAnother: () => void;
  onUseFix: () => void;
  title: string;
};

/** Asked when a pick would invert the range: move the other edge, or choose again. */
export const LoopEditorPickConflictDialog = ({
  fixLabel,
  message,
  onCancel,
  onPickAnother,
  onUseFix,
  title,
}: LoopEditorPickConflictDialogProps) => {
  return (
    <CenteredDialogCard isVisible onRequestClose={onCancel}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        {fixLabel ? (
          <OutlinedActionButton
            label={fixLabel}
            onPress={onUseFix}
            variant="accent"
          />
        ) : null}
        <OutlinedActionButton
          label="Pick another marker"
          onPress={onPickAnother}
        />
        <OutlinedActionButton label="Cancel" onPress={onCancel} />
      </View>
    </CenteredDialogCard>
  );
};

const styles = StyleSheet.create({
  actions: {
    gap: appTheme.space.xs,
  },
  message: {
    ...appTheme.type.body,
    color: appTheme.colors.textSecondary,
  },
  title: {
    ...appTheme.type.sheetTitle,
    color: appTheme.colors.text,
  },
});
