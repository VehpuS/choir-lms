import { StyleSheet, Text, View } from 'react-native';

import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { appTheme } from '../../../../utils/theme';
import { InteractionChip } from '../../../components/interaction-chip';
import { FilterChipGroup } from '../../../search/components/library-search-filter-groups';
import {
  TAG_MATCH_LIST_SORT_FIELD_OPTIONS,
  TAG_MATCH_TYPE_FILTER_OPTIONS,
  getTagMatchListSortDirectionToggleLabel,
  type TagMatchListSortState,
  type TagMatchTypeFilterValue,
} from './model';

type TagMatchControlsPanelProps = {
  onChangeSortState: (sortState: TagMatchListSortState) => void;
  onToggleTypeFilter: (value: TagMatchTypeFilterValue) => void;
  selectedTypeFilters: TagMatchTypeFilterValue[];
  sortState: TagMatchListSortState;
};

export const TagMatchControlsPanel = ({
  onChangeSortState,
  onToggleTypeFilter,
  selectedTypeFilters,
  sortState,
}: TagMatchControlsPanelProps) => {
  return (
    <View style={styles.panel}>
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
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Type</Text>
        <View style={styles.filterRow}>
          {TAG_MATCH_TYPE_FILTER_OPTIONS.map((option) => {
            return (
              <InteractionChip
                key={option.value}
                label={option.label}
                onPress={() => {
                  onToggleTypeFilter(option.value);
                }}
                style={styles.filterChip}
                variant={
                  selectedTypeFilters.includes(option.value)
                    ? 'selected'
                    : 'passive'
                }
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    gap: 12,
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
  sortDirectionToggle: { width: 32, height: 32 },
});
