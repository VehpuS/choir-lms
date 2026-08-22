import { StyleSheet } from 'react-native';

import { SurfaceIconButton } from '../../components/surface-icon-button';
import { appTheme } from '../../utils/theme';
import { FilterChipGroup } from '../search/components/library-search-filter-groups';
import {
  resolveSortDirectionIcon,
  type SortFieldChipRowDirection,
} from './sort-field-chip-row-model';

type SortFieldChipRowProps<Field extends string> = {
  directionToggleAccessibilityLabel: string;
  direction: SortFieldChipRowDirection;
  fieldOptions: { label: string; value: Field }[];
  label?: string;
  onSelectField: (field: Field) => void;
  onToggleDirection: () => void;
  selectedField: Field;
};

export const SortFieldChipRow = <Field extends string>({
  directionToggleAccessibilityLabel,
  direction,
  fieldOptions,
  label = 'Sort',
  onSelectField,
  onToggleDirection,
  selectedField,
}: SortFieldChipRowProps<Field>) => {
  return (
    <FilterChipGroup
      filterChipStyle={styles.filterChip}
      filterGroupStyle={styles.filterGroup}
      filterLabelRowStyle={styles.filterLabelRow}
      filterLabelStyle={styles.filterLabel}
      filterRowStyle={styles.filterRow}
      label={label}
      onSelectValue={onSelectField}
      options={fieldOptions}
      selectedValue={selectedField}
      trailingAction={
        <SurfaceIconButton
          accessibilityLabel={directionToggleAccessibilityLabel}
          icon={resolveSortDirectionIcon(direction)}
          onPress={onToggleDirection}
          size={16}
          style={styles.sortDirectionToggle}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
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
