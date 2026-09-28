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
          size={18}
          style={styles.sortDirectionToggle}
        />
      }
    />
  );
};

// The sort block shared by Tracks, Loops, and search (screens 1c, 1d, 1j):
// kicker label, a square outlined direction toggle, then 44pt field chips.
const styles = StyleSheet.create({
  filterChip: { paddingHorizontal: 14 },
  filterGroup: { gap: appTheme.space.xs },
  filterLabel: {
    ...appTheme.type.kicker,
    color: appTheme.colors.textMuted,
  },
  filterLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.space.xs },
  sortDirectionToggle: { borderRadius: appTheme.radius.md },
});
