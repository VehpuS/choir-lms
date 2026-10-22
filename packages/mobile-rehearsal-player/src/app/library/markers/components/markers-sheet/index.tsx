import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { darkScrollbarStyle } from '../../../../components/dark-scrollbar';
import { OutlinedActionButton } from '../../../../components/outlined-action-button';
import { SegmentedControl } from '../../../../components/segmented-control';
import { appTheme } from '../../../../utils/theme';
import { BottomSheetSurface } from '../../../components/bottom-sheet-surface';
import { SelectEntryButton } from '../../../selection/select-entry-button';
import { MarkerNoticeBar } from './marker-notice-bar';
import { MarkerRow } from './marker-row';
import { MarkerRowDialogs } from './marker-row-dialogs';
import {
  INITIAL_MARKER_SELECTION,
  MARKERS_FILTER_OPTIONS,
  cancelMarkerSelection,
  resolveMarkerPairLoop,
  startMarkerSelection,
  toggleMarkerSelection,
} from './model';
import type { MarkersSheetProps } from './props';
import { useMarkersSheetState } from './use-markers-sheet-state';

export type { MarkerAddResult, MarkersSheetProps } from './props';

const LIST_MAX_HEIGHT = 360;

/**
 * The markers list as a bottom sheet: filter, add / select / create-loops
 * controls, a row per marker with its action menu, and an inline undo for a
 * deletion. Data and writes come from the host; this holds only view state.
 */
export const MarkersSheet = (props: MarkersSheetProps) => {
  const { model, onClose } = props;
  const [selection, setSelection] = useState(INITIAL_MARKER_SELECTION);
  const { addHere, dialog, menuActions, notice, setDialog } =
    useMarkersSheetState(props);
  const pairLoop = resolveMarkerPairLoop(
    model.rows,
    selection,
    props.durationMs,
  );

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
        <View style={styles.filterRow}>
          <SegmentedControl
            style={styles.filter}
            accessibilityLabel="Marker filter"
            onSelect={props.onFilterChange}
            options={MARKERS_FILTER_OPTIONS.map(({ filter, label }) => ({
              label,
              value: filter,
            }))}
            selectedValue={props.filter}
          />
          {model.canSelect && !selection.isSelecting ? (
            <SelectEntryButton
              onPress={() => {
                setSelection(startMarkerSelection());
              }}
            />
          ) : null}
        </View>
        {selection.isSelecting ? (
          <Text style={styles.hint}>Choose two markers to bound a loop.</Text>
        ) : (
          <View style={styles.actions}>
            {model.canAddMarker ? (
              <OutlinedActionButton
                fill
                icon="plus"
                label="Add marker here"
                onPress={addHere}
                variant="accent"
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
        {notice ? (
          <MarkerNoticeBar
            actionLabel={notice.action?.label}
            message={notice.message}
            onAction={notice.action?.onPress}
          />
        ) : null}
      </BottomSheetSurface>
      <MarkerRowDialogs
        dialog={dialog}
        menuActions={menuActions}
        onClose={() => {
          setDialog(null);
        }}
        sheet={props}
      />
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
  filter: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.xs,
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
