import type { MarkerListFilter } from '@org/audio-library-models';

import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { FeedbackCard } from '../../../components/feedback-card';
import { MarkersSheet } from '../../../markers/components/markers-sheet';
import type { MarkersSheetModel } from '../../../markers/components/markers-sheet/model';
import { setMarkersFilter } from '../../../markers/markers-filter-preference';
import type { LoopBuilderBoundary } from '../../utils/saved-loop-view-model';

const noop = () => undefined;

type LoopEditorMarkerControlsProps = {
  armed: LoopBuilderBoundary | null;
  invalidRangeMessage: string | null;
  isPreparing: boolean;
  onOpenPicker: () => void;
};

/** `Pick marker` while a card is armed, and the note for an unusable range. */
export const LoopEditorMarkerControls = ({
  armed,
  invalidRangeMessage,
  isPreparing,
  onOpenPicker,
}: LoopEditorMarkerControlsProps) => {
  return (
    <>
      {armed ? (
        <OutlinedActionButton
          fill
          icon="flag-outline"
          label={`Pick marker for ${armed}`}
          onPress={onOpenPicker}
        />
      ) : null}
      {invalidRangeMessage && !isPreparing ? (
        <FeedbackCard
          message={invalidRangeMessage}
          size="compact"
          title="Check the loop range"
          tone="warning"
        />
      ) : null}
    </>
  );
};

type LoopEditorMarkerPickerProps = {
  durationMs?: number;
  filter: MarkerListFilter;
  model: MarkersSheetModel;
  onClose: () => void;
  onPick: (positionMs: number) => void;
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
        onPick(row.positionMs);
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
