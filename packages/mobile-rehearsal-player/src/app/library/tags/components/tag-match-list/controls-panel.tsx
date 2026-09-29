import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../../utils/theme';
import { InteractionChip } from '../../../components/interaction-chip';
import { SortFieldChipRow } from '../../../components/sort-field-chip-row';
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
      <SortFieldChipRow
        direction={sortState.direction}
        directionToggleAccessibilityLabel={getTagMatchListSortDirectionToggleLabel(
          sortState.direction,
        )}
        fieldOptions={TAG_MATCH_LIST_SORT_FIELD_OPTIONS}
        onSelectField={(field) => {
          onChangeSortState({ ...sortState, field });
        }}
        onToggleDirection={() => {
          onChangeSortState({
            ...sortState,
            direction: sortState.direction === 'asc' ? 'desc' : 'asc',
          });
        }}
        selectedField={sortState.field}
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

// Same kicker and 44pt chips as the Library filter popover (screen 1j).
const styles = StyleSheet.create({
  panel: {
    gap: appTheme.space.md,
  },
  filterGroup: { gap: appTheme.space.xs },
  filterLabel: {
    ...appTheme.type.kicker,
    color: appTheme.colors.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: appTheme.space.xs,
  },
});
