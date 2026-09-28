import type { ReactNode } from 'react';
import {
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { InteractionChip } from '../../components/interaction-chip';
import type {
  LibraryFilesSearchScope,
  LibraryFilesSortMode,
} from '../../saved-rehearsal-library/library-files-model';

export { ENTITY_FILTER_OPTIONS } from './library-search-entity-filter-options';

export const FILES_SORT_OPTIONS: {
  label: string;
  value: LibraryFilesSortMode;
}[] = [
  { label: 'Name', value: 'name' },
  { label: 'Type', value: 'type' },
  { label: 'Date added', value: 'date-added' },
  { label: 'Date opened', value: 'date-opened' },
];

export const buildFilesSearchScopeOptions = (
  currentFilesFolderName: string | null,
): Array<{
  label: string;
  value: LibraryFilesSearchScope;
}> => {
  return [
    {
      label: currentFilesFolderName
        ? `This folder (${currentFilesFolderName})`
        : 'This folder',
      value: 'current-folder',
    },
    {
      label: 'All Files',
      value: 'all-files',
    },
  ];
};

type FilterOption<Value extends string> = {
  label: string;
  value: Value;
};

export const FilterChipGroup = <Value extends string>({
  filterChipStyle,
  filterGroupStyle,
  filterLabelRowStyle,
  filterLabelStyle,
  filterRowStyle,
  label,
  onSelectValue,
  options,
  selectedValue,
  trailingAction,
}: {
  filterChipStyle: StyleProp<ViewStyle>;
  filterGroupStyle: StyleProp<ViewStyle>;
  filterLabelRowStyle?: StyleProp<ViewStyle>;
  filterLabelStyle: StyleProp<TextStyle>;
  filterRowStyle: StyleProp<ViewStyle>;
  label: string;
  onSelectValue: (value: Value) => void;
  options: ReadonlyArray<FilterOption<Value>>;
  selectedValue: Value;
  trailingAction?: ReactNode;
}) => {
  const labelText = <Text style={filterLabelStyle}>{label}</Text>;

  return (
    <View style={filterGroupStyle}>
      {trailingAction && filterLabelRowStyle ? (
        <View style={filterLabelRowStyle}>
          {labelText}
          {trailingAction}
        </View>
      ) : (
        labelText
      )}
      <View style={filterRowStyle}>
        {options.map((option) => {
          return (
            <InteractionChip
              key={option.value}
              label={option.label}
              onPress={() => {
                onSelectValue(option.value);
              }}
              style={filterChipStyle}
              variant={selectedValue === option.value ? 'selected' : 'passive'}
            />
          );
        })}
      </View>
    </View>
  );
};
