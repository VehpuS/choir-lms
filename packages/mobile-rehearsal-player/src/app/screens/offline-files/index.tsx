import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { darkScrollbarStyle } from '../../components/dark-scrollbar';
import { DestinationHeader } from '../../components/destination-header';
import { useEscapeToDismiss } from '../../components/escape-to-dismiss/use-escape-to-dismiss';
import { useFocusOnMount } from '../../components/focus-on-mount/use-focus-on-mount';
import { OutlinedActionButton } from '../../components/outlined-action-button';
import { scrollGutterStyles } from '../../components/scroll-gutter';
import { SegmentedControl } from '../../components/segmented-control';
import { SurfaceIconButton } from '../../components/surface-icon-button';
import type {
  OfflineFileRow,
  OfflineFileSort,
} from '../../library/offline/offline-storage-model';
import type { BulkAction } from '../../library/selection/bulk-action-model';
import { getSelectionCountLabel } from '../../library/selection/selection-copy';
import { SelectEntryButton } from '../../library/selection/select-entry-button';
import { SelectionBar } from '../../library/selection/selection-bar';
import { useLibraryFilesConfirmationFlow } from '../../library/selection/use-library-files-confirmation-flow';
import { usePinnedBulkActionBar } from '../../library/selection/use-pinned-bulk-action-bar';
import { useSelection } from '../../library/selection/use-selection';
import { appTheme } from '../../utils/theme';
import {
  OFFLINE_FILES_COPY,
  OFFLINE_SORT_OPTIONS,
  getAutomaticUsageLabel,
  getClearAllConfirmation,
  getClearAutomaticConfirmation,
  getKeptUsageLabel,
  getRemoveSelectionConfirmation,
} from './model';
import { offlineFilesNavigationStore } from './offline-files-navigation-store';
import { OfflineFileRowView } from './offline-file-row';
import { useOfflineStorage } from './use-offline-storage';

const toSelectionEntry = (row: OfflineFileRow) => ({
  item: row,
  key: row.driveFileId,
});

/**
 * Every stored audio file with its size, split into the files the user kept
 * and the automatic cache, with removal of one file, a selection, the
 * automatic cache or everything (task 1.6). It reuses the library's shared
 * selection model and bars rather than a list design of its own.
 */
export const OfflineFilesScreen = () => {
  const screenRef = useRef<View>(null);
  const [sort, setSort] = useState<OfflineFileSort>('recent');
  const { isLoading, service, snapshot } = useOfflineStorage(sort);
  const confirmationFlow = useLibraryFilesConfirmationFlow();
  const selection = useSelection<OfflineFileRow>();
  const { cancel, deselectMany, enter, selectMany, selectedKeys, toggle } =
    selection;
  const allRows = useMemo(
    () => [...snapshot.kept, ...snapshot.automatic],
    [snapshot],
  );

  // Escape or the back button steps out of selection first, then closes.
  useEscapeToDismiss(true, () => {
    if (selection.isActive) {
      cancel();

      return;
    }

    offlineFilesNavigationStore.close();
  });
  useFocusOnMount(screenRef);

  const selectedRows = useMemo(
    () => allRows.filter((row) => selectedKeys.has(row.driveFileId)),
    [allRows, selectedKeys],
  );
  const removeSelected = useCallback(() => {
    confirmationFlow.requestConfirmation({
      content: getRemoveSelectionConfirmation(selectedRows),
      onConfirm: async () => {
        await service.removeMany(selectedRows.map((row) => row.driveFileId));
        cancel();
      },
    });
  }, [cancel, confirmationFlow, selectedRows, service]);
  const actions = useMemo<BulkAction[]>(
    () => [
      {
        icon: 'trash-can-outline',
        id: 'remove-offline',
        isDisabled: selectedRows.length === 0,
        label: OFFLINE_FILES_COPY.removeLabel,
        onPress: removeSelected,
        tone: 'destructive',
      },
    ],
    [removeSelected, selectedRows.length],
  );
  const overflowTitle = getSelectionCountLabel(selection.selectedCount);

  usePinnedBulkActionBar(
    useMemo(
      () => (selection.isActive ? { actions, overflowTitle } : null),
      [actions, overflowTitle, selection.isActive],
    ),
  );

  const isAllSelected =
    allRows.length > 0 &&
    allRows.every((row) => selectedKeys.has(row.driveFileId));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      deselectMany(allRows.map((row) => row.driveFileId));

      return;
    }

    selectMany(
      allRows
        .filter((row) => !selectedKeys.has(row.driveFileId))
        .map(toSelectionEntry),
    );
  };

  const renderRows = (rows: readonly OfflineFileRow[]) =>
    rows.map((row) => (
      <OfflineFileRowView
        isSelected={selectedKeys.has(row.driveFileId)}
        isSelecting={selection.isActive}
        key={row.driveFileId}
        onEnterSelection={() => {
          enter(toSelectionEntry(row));
        }}
        onToggle={() => {
          toggle(toSelectionEntry(row));
        }}
        row={row}
      />
    ));
  const isEmpty = allRows.length === 0;

  return (
    <View
      accessibilityLabel={OFFLINE_FILES_COPY.title}
      accessible={false}
      ref={screenRef}
      style={styles.screen}
      tabIndex={-1}
    >
      <DestinationHeader
        title={OFFLINE_FILES_COPY.title}
        trailingAction={
          <View style={styles.actions}>
            {!selection.isActive && !isEmpty ? (
              <SelectEntryButton onPress={() => enter()} />
            ) : null}
            <SurfaceIconButton
              accessibilityLabel={OFFLINE_FILES_COPY.closeLabel}
              icon="close"
              onPress={offlineFilesNavigationStore.close}
            />
          </View>
        }
      />
      {selection.isActive ? (
        <SelectionBar
          onCancel={cancel}
          selectAll={{
            isAllSelected,
            isDisabled: allRows.length === 0,
            onToggle: toggleSelectAll,
          }}
          selectedCount={selection.selectedCount}
        />
      ) : null}
      <ScrollView
        contentContainerStyle={[styles.content, scrollGutterStyles.content]}
        style={[darkScrollbarStyle, scrollGutterStyles.scrollView]}
      >
        <View style={styles.summary}>
          <Text style={styles.summaryLine}>
            {`Automatic cache: ${getAutomaticUsageLabel(snapshot.summary)}`}
          </Text>
          <Text style={styles.summaryLine}>
            {getKeptUsageLabel(snapshot.summary)}
          </Text>
        </View>
        {isLoading ? null : isEmpty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {OFFLINE_FILES_COPY.emptyTitle}
            </Text>
            <Text style={styles.emptyBody}>{OFFLINE_FILES_COPY.emptyBody}</Text>
          </View>
        ) : (
          <>
            <SegmentedControl
              accessibilityLabel="Sort offline files"
              onSelect={setSort}
              options={OFFLINE_SORT_OPTIONS}
              selectedValue={sort}
            />
            {snapshot.kept.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>
                  {OFFLINE_FILES_COPY.keptTitle}
                </Text>
                {renderRows(snapshot.kept)}
              </View>
            ) : null}
            {snapshot.automatic.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>
                  {OFFLINE_FILES_COPY.automaticTitle}
                </Text>
                {renderRows(snapshot.automatic)}
              </View>
            ) : null}
            <View style={styles.footerActions}>
              <OutlinedActionButton
                disabled={snapshot.automatic.length === 0}
                label={OFFLINE_FILES_COPY.clearAutomaticLabel}
                onPress={() => {
                  confirmationFlow.requestConfirmation({
                    content: getClearAutomaticConfirmation(snapshot.automatic),
                    onConfirm: service.clearAutomatic,
                  });
                }}
                variant="neutral"
              />
              <OutlinedActionButton
                label={OFFLINE_FILES_COPY.clearAllLabel}
                onPress={() => {
                  confirmationFlow.requestConfirmation({
                    content: getClearAllConfirmation(allRows),
                    onConfirm: service.clearAll,
                  });
                }}
                variant="destructive"
              />
            </View>
          </>
        )}
      </ScrollView>
      {confirmationFlow.confirmationDialog}
    </View>
  );
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  content: {
    gap: appTheme.space.lg,
    paddingBottom: appTheme.space.xl,
  },
  empty: {
    gap: appTheme.space.xs,
  },
  emptyBody: {
    color: appTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyTitle: {
    color: appTheme.colors.text,
    fontSize: 17,
    fontWeight: appTheme.fontWeight.medium,
  },
  footerActions: {
    gap: appTheme.space.sm,
  },
  screen: {
    backgroundColor: appTheme.colors.bg,
    flex: 1,
    paddingHorizontal: appTheme.space.screenInset,
  },
  sectionTitle: {
    ...appTheme.type.kicker,
    color: appTheme.colors.textMuted,
    paddingBottom: appTheme.space.xs,
  },
  summary: {
    gap: 2,
  },
  summaryLine: {
    color: appTheme.colors.text,
    fontSize: 14,
  },
});
