import type { TrackMarker } from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { darkScrollbarStyle } from '../../../../components/dark-scrollbar';
import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { SegmentedControl } from '../../../../components/segmented-control';
import { appTheme } from '../../../../utils/theme';
import { BottomSheetSurface } from '../../../components/bottom-sheet-surface';
import { OptionsMenuSheet } from '../../../components/options-menu-sheet';
import type { OptionsMenuAction } from '../../../components/options-menu-sheet/model';
import { MoveMarkerDialog, RenameMarkerDialog } from './marker-dialogs';
import { MarkerRow } from './marker-row';
import { MarkerUndoBar } from './marker-undo-bar';
import {
  INITIAL_MARKER_SELECTION,
  MARKERS_FILTER_OPTIONS,
  MARKER_ROW_ACTION_LABELS,
  cancelMarkerSelection,
  resolveMarkerPairLoop,
  startMarkerSelection,
  toggleMarkerSelection,
  type MarkerLoopDraft,
  type MarkerRow as MarkerRowModel,
  type MarkerRowAction,
  type MarkersSheetModel,
} from './model';
import type { MarkerListFilter } from '@org/audio-library-models';

const UNDO_VISIBLE_MS = 5000;
const LIST_MAX_HEIGHT = 360;

const ROW_ACTION_ICONS: Record<
  MarkerRowAction,
  NonNullable<OptionsMenuAction['icon']>
> = {
  delete: 'trash-can-outline',
  'keep-as-marker': 'plus',
  'loop-to-next': 'repeat',
  move: 'swap-horizontal',
  'open-loop': 'repeat',
  rename: 'pencil-outline',
};

export type MarkersSheetProps = {
  /** Playhead of the loaded owner, when there is one: `Set to current position`. */
  currentPositionMs?: number;
  durationMs?: number;
  filter: MarkerListFilter;
  model: MarkersSheetModel;
  onAddHere: () => void;
  onClose: () => void;
  onCreateLoops: () => void;
  onDelete: (markerId: string) => Promise<TrackMarker | undefined>;
  onFilterChange: (filter: MarkerListFilter) => void;
  onJump: (row: MarkerRowModel) => void;
  onKeepAsMarker: (row: MarkerRowModel) => void;
  onMakeLoop: (draft: MarkerLoopDraft) => void;
  onMove: (markerId: string, positionMs: number) => void;
  onOpenLoop: (loopId: string) => void;
  onRename: (markerId: string, name: string) => void;
  onRestore: (marker: TrackMarker) => void;
};

type OpenDialog =
  | { kind: 'menu'; row: MarkerRowModel }
  | { kind: 'move'; row: MarkerRowModel }
  | { kind: 'rename'; row: MarkerRowModel };

/**
 * The markers list as a bottom sheet: filter, add / select / create-loops
 * controls, a row per marker with its action menu, and an inline undo for a
 * deletion. Data and writes come from the host; this holds only view state.
 */
export const MarkersSheet = (props: MarkersSheetProps) => {
  const { model, onClose } = props;
  const [selection, setSelection] = useState(INITIAL_MARKER_SELECTION);
  const [dialog, setDialog] = useState<OpenDialog | null>(null);
  const [deleted, setDeleted] = useState<TrackMarker | null>(null);

  useEffect(() => {
    if (!deleted) {
      return;
    }

    const timer = setTimeout(() => {
      setDeleted(null);
    }, UNDO_VISIBLE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [deleted]);

  const pairLoop = resolveMarkerPairLoop(
    model.rows,
    selection,
    props.durationMs,
  );

  const runRowAction = (row: MarkerRowModel, action: MarkerRowAction) => {
    if (action === 'rename' || action === 'move') {
      setDialog({ kind: action, row });
      return;
    }

    setDialog(null);

    if (action === 'delete' && row.markerId) {
      void props.onDelete(row.markerId).then((marker) => {
        setDeleted(marker ?? null);
      });
    } else if (action === 'open-loop' && row.loopId) {
      props.onOpenLoop(row.loopId);
    } else if (action === 'keep-as-marker') {
      props.onKeepAsMarker(row);
    } else if (action === 'loop-to-next' && row.loopToNext) {
      props.onMakeLoop(row.loopToNext);
    }
  };

  const menuActions = (row: MarkerRowModel): OptionsMenuAction[] =>
    row.actions.map((action) => ({
      icon: ROW_ACTION_ICONS[action],
      id: `${row.key}:${action}`,
      label: MARKER_ROW_ACTION_LABELS[action],
      onPress: () => {
        runRowAction(row, action);
      },
      tone: action === 'delete' ? 'destructive' : 'secondary',
    }));

  return (
    <>
      <BottomSheetSurface
        footer={
          selection.isSelecting ? (
            <View style={styles.actions}>
              <OutlinedActionButton
                fill
                label="Cancel"
                onPress={() => {
                  setSelection(cancelMarkerSelection());
                }}
              />
              <OutlinedActionButton
                disabled={!pairLoop}
                fill
                label="Make loop"
                onPress={() => {
                  if (pairLoop) {
                    props.onMakeLoop(pairLoop);
                  }
                }}
                variant="accent"
              />
            </View>
          ) : (
            <OutlinedActionButton label="Done" onPress={onClose} />
          )
        }
        isVisible
        onClose={onClose}
        title={model.subtitle}
        titleNumberOfLines={2}
      >
        <SegmentedControl
          accessibilityLabel="Marker filter"
          onSelect={props.onFilterChange}
          options={MARKERS_FILTER_OPTIONS.map(({ filter, label }) => ({
            label,
            value: filter,
          }))}
          selectedValue={props.filter}
        />
        {selection.isSelecting ? (
          <Text style={styles.hint}>Choose two markers to bound a loop.</Text>
        ) : (
          <View style={styles.actions}>
            {model.canAddMarker ? (
              <OutlinedActionButton
                fill
                icon="plus"
                label="Add marker here"
                onPress={props.onAddHere}
                variant="accent"
              />
            ) : null}
            {model.canSelect ? (
              <OutlinedActionButton
                fill
                icon="select-multiple"
                label="Select"
                onPress={() => {
                  setSelection(startMarkerSelection());
                }}
              />
            ) : null}
          </View>
        )}
        {model.canCreateLoops && !selection.isSelecting ? (
          <OutlinedActionButton
            icon="repeat"
            label="Create loops from markers"
            onPress={props.onCreateLoops}
          />
        ) : null}
        {model.isEmpty ? (
          <Text style={styles.empty}>{model.emptyMessage}</Text>
        ) : (
          <ScrollView
            style={[darkScrollbarStyle, styles.list]}
            keyboardShouldPersistTaps="handled"
          >
            {model.rows.map((row) => (
              <MarkerRow
                isChecked={selection.selectedKeys.includes(row.key)}
                isSelecting={selection.isSelecting}
                key={row.key}
                onOpenMenu={() => {
                  setDialog({ kind: 'menu', row });
                }}
                onPress={() => {
                  if (selection.isSelecting) {
                    setSelection(toggleMarkerSelection(selection, row.key));
                    return;
                  }

                  props.onJump(row);
                }}
                row={row}
              />
            ))}
          </ScrollView>
        )}
        {deleted ? (
          <MarkerUndoBar
            markerName={deleted.name}
            onUndo={() => {
              props.onRestore(deleted);
              setDeleted(null);
            }}
          />
        ) : null}
      </BottomSheetSurface>
      {dialog?.kind === 'menu' ? (
        <OptionsMenuSheet
          actions={menuActions(dialog.row)}
          isVisible
          onClose={() => {
            setDialog(null);
          }}
          title={dialog.row.name}
        />
      ) : null}
      {dialog?.kind === 'rename' ? (
        <RenameMarkerDialog
          initialName={dialog.row.name}
          onCancel={() => {
            setDialog(null);
          }}
          onSubmit={(name) => {
            if (dialog.row.markerId) {
              props.onRename(dialog.row.markerId, name);
            }

            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.kind === 'move' ? (
        <MoveMarkerDialog
          currentPositionMs={props.currentPositionMs}
          durationMs={props.durationMs}
          initialPositionMs={dialog.row.positionMs}
          name={dialog.row.name}
          onCancel={() => {
            setDialog(null);
          }}
          onSubmit={(positionMs) => {
            if (dialog.row.markerId) {
              props.onMove(dialog.row.markerId, positionMs);
            }

            setDialog(null);
          }}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  empty: {
    ...appTheme.type.body,
    paddingVertical: appTheme.space.lg,
    textAlign: 'center',
    color: appTheme.colors.textMuted,
  },
  hint: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
  },
  list: {
    flexGrow: 0,
    maxHeight: LIST_MAX_HEIGHT,
  },
});
