import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RehearsalLibraryTagMatch } from '@org/audio-library-runtime';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { appTheme } from '../../../../utils/theme';
import { ExplorerListRow, ExplorerListSurface } from '../../../components/explorer';
import { FilterChipGroup } from '../../../search/components/library-search-filter-groups';
import {
  DEFAULT_TAG_MATCH_LIST_SORT_STATE,
  EMPTY_TAG_MATCH_LIST_MESSAGE,
  TAG_MATCH_LIST_SORT_FIELD_OPTIONS,
  getTagMatchIconName,
  getTagMatchKey,
  getTagMatchListSortDirectionToggleLabel,
  getTagMatchMetadataLabel,
  getTagMatchTitle,
  sortTagMatches,
  type TagMatchListSortState,
} from './model';

type TagMatchListProps = {
  matches: RehearsalLibraryTagMatch[];
  onChangeSortState: (sortState: TagMatchListSortState) => void;
  sortState?: TagMatchListSortState;
};

export const TagMatchList = ({
  matches,
  onChangeSortState,
  sortState = DEFAULT_TAG_MATCH_LIST_SORT_STATE,
}: TagMatchListProps) => {
  const sortedMatches = useMemo(() => {
    return sortTagMatches(matches, sortState);
  }, [matches, sortState]);

  if (matches.length === 0) {
    return <Text style={styles.emptyMessage}>{EMPTY_TAG_MATCH_LIST_MESSAGE}</Text>;
  }

  return (
    <View style={styles.container}>
      <FilterChipGroup
        filterChipStyle={styles.filterChip}
        filterGroupStyle={styles.filterGroup}
        filterLabelRowStyle={styles.filterLabelRow}
        filterLabelStyle={styles.filterLabel}
        filterRowStyle={styles.filterRow}
        label="Sort"
        onSelectValue={(field) => {
          onChangeSortState({ ...sortState, field });
        }}
        options={TAG_MATCH_LIST_SORT_FIELD_OPTIONS}
        selectedValue={sortState.field}
        trailingAction={
          <SurfaceIconButton
            accessibilityLabel={getTagMatchListSortDirectionToggleLabel(
              sortState.direction,
            )}
            icon={
              sortState.direction === 'asc' ? 'sort-ascending' : 'sort-descending'
            }
            onPress={() => {
              onChangeSortState({
                ...sortState,
                direction: sortState.direction === 'asc' ? 'desc' : 'asc',
              });
            }}
            size={16}
            style={styles.sortDirectionToggle}
          />
        }
      />
      <ExplorerListSurface>
        {sortedMatches.map((match) => {
          return (
            <ExplorerListRow
              key={getTagMatchKey(match)}
              leadingIcon={
                <MaterialCommunityIcons
                  color={appTheme.colors.secondaryText}
                  name={getTagMatchIconName(match)}
                  size={22}
                />
              }
              metadata={
                <Text style={styles.rowSupportingLabel}>
                  {getTagMatchMetadataLabel(match)}
                </Text>
              }
              title={<Text style={styles.rowTitle}>{getTagMatchTitle(match)}</Text>}
            />
          );
        })}
      </ExplorerListSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  emptyMessage: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  filterChip: { minHeight: 32, paddingHorizontal: 12, paddingVertical: 6 },
  filterGroup: { gap: 8 },
  filterLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  filterLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowSupportingLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  rowTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  sortDirectionToggle: { width: 32, height: 32 },
});
