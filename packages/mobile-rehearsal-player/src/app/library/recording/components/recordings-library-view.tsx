import type {
  DriveAudioSource,
  NamedLoop,
  PlayableItem,
} from '@org/audio-library-models';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { InteractionChip } from '../../components/interaction-chip';
import { LibraryEmptyState } from '../../components/library-empty-state';
import { RecentSearchSuggestions } from '../../search/components/recent-search-suggestions';
import { useRecentSearchHistory } from '../../search/hooks/use-recent-search-history';
import {
  useTagDetailHeaderSearchActions,
  type TagDetailHeaderSearchActions,
} from '../../tags/hooks/use-tag-detail-header-search-actions';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  offlineStateStore,
  useOfflineRevision,
} from '../../offline/offline-state';
import { resolveRecordingPlayback } from '../recording-playback-item';
import { useLibrarySelectionServices } from '../../selection/library-selection-services';
import { RECORDINGS_SORT_OPTIONS } from '../recordings-library-controls-model';
import {
  EMPTY_LIBRARY_MESSAGE,
  EMPTY_LIBRARY_TITLE,
  getRecordingsLibraryModel,
  type RecordingsFilters,
  type RecordingsSort,
} from '../recordings-library-model';
import { useRecordingsList } from '../use-recordings-list';
import { useAutoExportSettings } from '../export/auto-export-settings-store';
import { getRowExportStatus } from '../export/row-export-status';
import { RecordingRow } from './recording-row';
import { RecordingsLibraryFilterSheet } from './recordings-library-filter-sheet';
import { useRecordingRowMenu } from './use-recording-row-menu';
import { useRecordingsSelection } from '../use-recordings-selection';

const { colors, radius, space, type } = appTheme;

const SEARCH_PLACEHOLDER = 'Search recordings';
const RECENT_SEARCH_STORAGE_KEY = 'choirlms.recordings.recent-searches';
const HEADER_LABELS = {
  closeSearchAccessibilityLabel: 'Close search',
  hideFiltersAccessibilityLabel: 'Hide recording filters',
  searchAccessibilityLabel: 'Search recordings',
  showFiltersAccessibilityLabel: 'Show recording filters',
};

type RecordingsLibraryViewProps = {
  sources: readonly DriveLibrarySource[];
  loops: readonly NamedLoop[];
  /** Plays a resolved recording item (the shared playable-item toggle). */
  onPlayItem: (item: PlayableItem) => unknown;
  /** Puts this view's search and filter controls in the Library header. */
  onDetailSearchActionsChange?: (
    actions: TagDetailHeaderSearchActions | null,
  ) => void;
};

/**
 * The Library `Recordings` view (rehearsal-recording design Decision 15):
 * every recording on the device with search, filters, sorting and a row menu.
 * A projection of the recordings store, never part of the Files tree. Bulk
 * selection arrives with task 8.3.
 */
export const RecordingsLibraryView = ({
  loops,
  onDetailSearchActionsChange,
  onPlayItem,
  sources,
}: RecordingsLibraryViewProps) => {
  const { recordings, refresh } = useRecordingsList();
  const revision = useOfflineRevision();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<RecordingsFilters>({});
  const [sort, setSort] = useState<RecordingsSort>('newest');
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const { recentSearchTerms, recordSearchTerm } = useRecentSearchHistory({
    storageKey: RECENT_SEARCH_STORAGE_KEY,
  });
  // Only plain saved tracks own the originals the offline actions read.
  const tracks = useMemo<DriveAudioSource[]>(
    () => sources.filter((source) => !source.adjustment),
    [sources],
  );
  const library = useMemo(() => ({ sources, loops }), [loops, sources]);
  const exportSettings = useAutoExportSettings();
  const model = useMemo(
    () =>
      getRecordingsLibraryModel({
        recordings: recordings ?? [],
        query,
        filters,
        sort,
        offline: {
          sources: tracks,
          stateOf: (driveFileId) => offlineStateStore.getState(driveFileId),
        },
        exportStatusOf: (id) => {
          const recording = recordings?.find(
            (candidate) => candidate.id === id,
          );

          return recording
            ? getRowExportStatus(recording, exportSettings)
            : 'none';
        },
        now: new Date(),
      }),
    // `revision` changes whenever any file's offline state does.
    [exportSettings, filters, query, recordings, revision, sort, tracks],
  );
  useTagDetailHeaderSearchActions({
    hasActiveFilters: model.activeFilterCount > 0,
    isFilterPopoverVisible: isFilterSheetVisible,
    isSearchBarVisible,
    labels: HEADER_LABELS,
    onDetailSearchActionsChange,
    onToggleFilterPopover: () => setIsFilterSheetVisible((shown) => !shown),
    onToggleSearchBar: () => setIsSearchBarVisible((shown) => !shown),
  });
  const services = useLibrarySelectionServices();
  const { dialogs, isDriveFailed, openMenu, play, playIssue, retryDrive } =
    useRecordingRowMenu({
      playlistServices: {
        createPlaylist: services.createPlaylist,
        onAdded: services.acknowledge,
        playlists: services.collections.playlists,
        updatePlaylist: services.updatePlaylist,
      },
      queueServices: {
        canQueue: services.canQueue,
        onQueued: services.acknowledge,
        queueNext: services.queueItemsNext,
        queueUpNext: services.queueItemsUpNext,
        resolve: (recording) => {
          const resolution = resolveRecordingPlayback(recording, {
            sources,
            loops,
          });

          return resolution.kind === 'item' ? resolution.item : null;
        },
      },
      onPlay: (recording) => {
        const resolution = resolveRecordingPlayback(recording, {
          sources,
          loops,
        });

        if (resolution.kind === 'unavailable') {
          return resolution.message;
        }

        onPlayItem(resolution.item);

        return null;
      },
      recordings,
      refresh,
      rows: model.rows,
    });

  const shownRecordings = useMemo(
    () =>
      model.rows.flatMap(({ id }) => {
        const recording = recordings?.find((candidate) => candidate.id === id);

        return recording ? [recording] : [];
      }),
    [model.rows, recordings],
  );
  const selection = useRecordingsSelection({
    library,
    recordings: shownRecordings,
    refresh,
    stateOf: (driveFileId) => offlineStateStore.getState(driveFileId),
    tracks,
  });

  return (
    <View style={styles.view}>
      {isSearchBarVisible ? (
        <>
          <TextInput
            accessibilityLabel={SEARCH_PLACEHOLDER}
            autoCorrect={false}
            autoFocus
            onChangeText={setQuery}
            onSubmitEditing={() => recordSearchTerm(query)}
            placeholder={SEARCH_PLACEHOLDER}
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            style={styles.search}
            value={query}
          />
          {query === '' ? (
            <RecentSearchSuggestions
              onSelectRecentSearchTerm={setQuery}
              recentSearchTerms={recentSearchTerms}
            />
          ) : null}
        </>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.controls}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {selection.entryButton}
        {RECORDINGS_SORT_OPTIONS.map((option) => (
          <InteractionChip
            accessibilityLabel={`Sort by ${option.label}`}
            accessibilitySelected={sort === option.value}
            key={option.value}
            label={option.label}
            onPress={() => setSort(option.value)}
            variant={sort === option.value ? 'selected' : 'passive'}
          />
        ))}
      </ScrollView>
      {selection.selectionBar}
      {playIssue ? <Text style={styles.issue}>{playIssue}</Text> : null}
      {recordings && model.emptyMessage === EMPTY_LIBRARY_MESSAGE ? (
        <LibraryEmptyState
          message={EMPTY_LIBRARY_MESSAGE}
          title={EMPTY_LIBRARY_TITLE}
        />
      ) : recordings && model.emptyMessage ? (
        <Text style={styles.empty}>{model.emptyMessage}</Text>
      ) : null}
      {model.rows.map((row) => (
        <RecordingRow
          driveLabel={row.driveLabel}
          key={row.id}
          onOpenMenu={openMenu}
          onPlay={play}
          onRetryDrive={isDriveFailed(row.id) ? retryDrive : undefined}
          row={row}
          selection={
            selection.isActive ? selection.getRowSelection(row.id) : undefined
          }
          trackName={row.trackName}
        />
      ))}
      {dialogs}
      {selection.dialogs}
      {isFilterSheetVisible ? (
        <RecordingsLibraryFilterSheet
          filters={filters}
          onChange={setFilters}
          onClose={() => setIsFilterSheetVisible(false)}
          trackOptions={model.trackOptions}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', gap: space.xs },
  empty: { ...type.rowMeta, color: colors.textMuted },
  issue: { ...type.rowMeta, color: colors.danger },
  search: {
    ...type.rowTitle,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderChip,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    minHeight: space.touchTarget,
  },
  view: { gap: space.sm, paddingHorizontal: space.md },
});
