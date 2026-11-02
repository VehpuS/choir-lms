import type {
  DriveAudioSource,
  NamedLoop,
  PlayableItem,
} from '@org/audio-library-models';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { InteractionChip } from '../../components/interaction-chip';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import {
  offlineStateStore,
  useOfflineRevision,
} from '../../offline/offline-state';
import { resolveRecordingPlayback } from '../recording-playback-item';
import { RECORDINGS_SORT_OPTIONS } from '../recordings-library-controls-model';
import {
  getRecordingsLibraryModel,
  type RecordingsFilters,
  type RecordingsSort,
} from '../recordings-library-model';
import { useRecordingsList } from '../use-recordings-list';
import { RecordingRow } from './recording-row';
import { RecordingsLibraryFilterSheet } from './recordings-library-filter-sheet';
import { useRecordingRowMenu } from './use-recording-row-menu';
import { useRecordingsSelection } from '../use-recordings-selection';

const { colors, radius, space, type } = appTheme;

const SEARCH_PLACEHOLDER = 'Search recordings';

type RecordingsLibraryViewProps = {
  sources: readonly DriveLibrarySource[];
  loops: readonly NamedLoop[];
  /** Plays a resolved recording item (the shared playable-item toggle). */
  onPlayItem: (item: PlayableItem) => unknown;
};

/**
 * The Library `Recordings` view (rehearsal-recording design Decision 15):
 * every recording on the device with search, filters, sorting and a row menu.
 * A projection of the recordings store, never part of the Files tree. Bulk
 * selection arrives with task 8.3.
 */
export const RecordingsLibraryView = ({
  loops,
  onPlayItem,
  sources,
}: RecordingsLibraryViewProps) => {
  const { recordings, refresh } = useRecordingsList();
  const revision = useOfflineRevision();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<RecordingsFilters>({});
  const [sort, setSort] = useState<RecordingsSort>('newest');
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  // Only plain saved tracks own the originals the offline actions read.
  const tracks = useMemo<DriveAudioSource[]>(
    () => sources.filter((source) => !source.adjustment),
    [sources],
  );
  const library = useMemo(() => ({ sources, loops }), [loops, sources]);
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
        // The export record arrives with task 10.4.
        exportStatusOf: () => 'none',
        now: new Date(),
      }),
    // `revision` changes whenever any file's offline state does.
    [filters, query, recordings, revision, sort, tracks],
  );
  const { dialogs, openMenu, play, playIssue } = useRecordingRowMenu({
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
      <TextInput
        accessibilityLabel={SEARCH_PLACEHOLDER}
        autoCorrect={false}
        onChangeText={setQuery}
        placeholder={SEARCH_PLACEHOLDER}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        style={styles.search}
        value={query}
      />
      <ScrollView
        contentContainerStyle={styles.controls}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <InteractionChip
          accessibilityLabel="Filter recordings"
          label={
            model.activeFilterCount > 0
              ? `Filters · ${model.activeFilterCount}`
              : 'Filters'
          }
          onPress={() => setIsFilterSheetVisible(true)}
          variant={model.activeFilterCount > 0 ? 'selected' : 'action'}
        />
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
      {recordings && model.emptyMessage ? (
        <Text style={styles.empty}>{model.emptyMessage}</Text>
      ) : null}
      {model.rows.map((row) => (
        <RecordingRow
          driveLabel={row.driveLabel}
          key={row.id}
          onOpenMenu={openMenu}
          onPlay={play}
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
