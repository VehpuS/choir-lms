import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InteractionChip } from '../../components/interaction-chip';
import { getLibrarySearchContextCopy } from '../../drive/utils/drive-library-view-model';
import type {
  LibrarySearchAvailabilityFilter,
  LibrarySearchEntityFilter,
} from '../utils/saved-library-search-view-model';
import { ContextualSearchPanel } from './contextual-search-panel';

const ENTITY_FILTER_OPTIONS: {
  label: string;
  value: LibrarySearchEntityFilter;
}[] = [
  { label: 'All', value: 'all' },
  { label: 'Tracks', value: 'tracks' },
  { label: 'Loops', value: 'loops' },
  { label: 'Playlists', value: 'playlists' },
];

const AVAILABILITY_FILTER_OPTIONS: {
  label: string;
  value: LibrarySearchAvailabilityFilter;
}[] = [
  { label: 'Any status', value: 'all' },
  { label: 'Playable', value: 'available' },
  { label: 'Unavailable', value: 'unavailable' },
];

export type LibrarySearchPanelMode = 'collapsed' | 'filter' | 'search';

const ACTION_BUTTON_SIZE = 40;
const ACTION_ROW_GAP = 12;
const ACTION_ROW_WIDTH = ACTION_BUTTON_SIZE * 2 + ACTION_ROW_GAP;
const FILTER_POPOVER_MAX_WIDTH = 360;

type FilterOption<Value extends string> = {
  label: string;
  value: Value;
};

type LibrarySearchPanelProps = {
  availabilityFilter: LibrarySearchAvailabilityFilter;
  entityFilter: LibrarySearchEntityFilter;
  panelMode: LibrarySearchPanelMode;
  onClearSearch: () => void;
  onPanelModeChange: (value: LibrarySearchPanelMode) => void;
  onSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectAvailabilityFilter: (value: LibrarySearchAvailabilityFilter) => void;
  onSelectEntityFilter: (value: LibrarySearchEntityFilter) => void;
  onSelectRecentSearchTerm: (value: string) => void;
  recentSearchTerms: string[];
  searchQuery: string;
};

type LibrarySearchPanelActionsProps = Pick<
  LibrarySearchPanelProps,
  'availabilityFilter' | 'entityFilter' | 'onPanelModeChange' | 'panelMode'
>;

type LibrarySearchActionButtonProps = {
  accessibilityLabel: string;
  iconName: 'close' | 'magnify' | 'tune-variant';
  isFilled: boolean;
  onPress: () => void;
};

const FilterChipGroup = <Value extends string>({
  label,
  onSelectValue,
  options,
  selectedValue,
}: {
  label: string;
  onSelectValue: (value: Value) => void;
  options: ReadonlyArray<FilterOption<Value>>;
  selectedValue: Value;
}) => {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.filterRow}>
        {options.map((option) => {
          return (
            <InteractionChip
              key={option.value}
              label={option.label}
              onPress={() => {
                onSelectValue(option.value);
              }}
              style={styles.filterChip}
              variant={selectedValue === option.value ? 'selected' : 'passive'}
            />
          );
        })}
      </View>
    </View>
  );
};

const LibrarySearchActionButton = ({
  accessibilityLabel,
  iconName,
  isFilled,
  onPress,
}: LibrarySearchActionButtonProps) => {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        isFilled ? styles.actionButtonFilled : undefined,
        pressed ? styles.actionButtonPressed : undefined,
      ]}
    >
      <MaterialCommunityIcons
        color={isFilled ? '#fff8ef' : '#305c4d'}
        name={iconName}
        size={18}
      />
    </Pressable>
  );
};

export const LibrarySearchPanelActions = ({
  availabilityFilter,
  entityFilter,
  onPanelModeChange,
  panelMode,
}: LibrarySearchPanelActionsProps) => {
  const hasActiveFilters =
    entityFilter !== 'all' || availabilityFilter !== 'all';

  return (
    <View style={styles.actionRow}>
      {panelMode === 'search' ? (
        <View style={styles.actionSpacer} />
      ) : (
        <LibrarySearchActionButton
          accessibilityLabel={
            panelMode === 'filter'
              ? 'Hide library filters'
              : 'Show library filters'
          }
          iconName="tune-variant"
          isFilled={panelMode === 'filter' || hasActiveFilters}
          onPress={() => {
            onPanelModeChange(panelMode === 'filter' ? 'collapsed' : 'filter');
          }}
        />
      )}
      {panelMode === 'filter' ? (
        <View style={styles.actionSpacer} />
      ) : (
        <LibrarySearchActionButton
          accessibilityLabel={
            panelMode === 'search' ? 'Close search' : 'Search saved library'
          }
          iconName={panelMode === 'search' ? 'close' : 'magnify'}
          isFilled={true}
          onPress={() => {
            onPanelModeChange(panelMode === 'search' ? 'collapsed' : 'search');
          }}
        />
      )}
    </View>
  );
};

export const LibrarySearchPanel = ({
  availabilityFilter,
  entityFilter,
  panelMode,
  onClearSearch,
  onPanelModeChange,
  onSearch,
  onSearchQueryChange,
  onSelectAvailabilityFilter,
  onSelectEntityFilter,
  onSelectRecentSearchTerm,
  recentSearchTerms,
  searchQuery,
}: LibrarySearchPanelProps) => {
  const searchContextCopy = getLibrarySearchContextCopy();

  if (panelMode === 'search') {
    return (
      <ContextualSearchPanel
        clearActionLabel="Show all saved items"
        helperCopy={searchContextCopy.helper}
        isSearchBarVisible={true}
        onClearSearch={onClearSearch}
        onSearch={onSearch}
        onSearchQueryChange={onSearchQueryChange}
        onToggleSearchBar={() => {
          onPanelModeChange('collapsed');
        }}
        onSelectRecentSearchTerm={onSelectRecentSearchTerm}
        placeholderCopy={searchContextCopy.placeholder}
        recentSearchTerms={recentSearchTerms}
        searchAccessibilityLabel="Search saved library"
        searchQuery={searchQuery}
        showInlineToggleButton={false}
      />
    );
  }

  if (panelMode === 'filter') {
    return (
      <View style={styles.filterPopover}>
        <FilterChipGroup
          label="Show"
          onSelectValue={onSelectEntityFilter}
          options={ENTITY_FILTER_OPTIONS}
          selectedValue={entityFilter}
        />
        <FilterChipGroup
          label="Availability"
          onSelectValue={onSelectAvailabilityFilter}
          options={AVAILABILITY_FILTER_OPTIONS}
          selectedValue={availabilityFilter}
        />
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  actionRow: {
    width: ACTION_ROW_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionSpacer: {
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
  },
  actionButton: {
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c8c0b2',
    backgroundColor: '#f7f1e7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonFilled: {
    borderColor: '#305c4d',
    backgroundColor: '#305c4d',
  },
  actionButtonPressed: {
    opacity: 0.8,
  },
  filterPopover: {
    alignSelf: 'flex-end',
    width: '100%',
    maxWidth: FILTER_POPOVER_MAX_WIDTH,
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 20,
    backgroundColor: '#fffcf4',
    shadowColor: '#173229',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  filterGroup: { gap: 8 },
  filterLabel: {
    color: '#5f5647',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { minHeight: 32, paddingHorizontal: 12, paddingVertical: 6 },
});
