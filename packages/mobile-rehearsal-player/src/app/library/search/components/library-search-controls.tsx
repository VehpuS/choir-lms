import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InteractionChip } from '../../components/interaction-chip';
import { getLibrarySearchContextCopy } from '../../drive/utils/drive-library-view-model';
import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import type { LibraryFilesSearchScope } from '../../saved-rehearsal-library/library-files-model';
import type {
  LibrarySearchAvailabilityFilter,
  LibrarySearchEntityFilter,
} from '../utils/saved-library-search-view-model';
import { ContextualSearchPanel } from './contextual-search-panel';
import type { LibrarySearchControlsVisibility } from './library-search-controls-visibility';

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

const buildFilesSearchScopeOptions = (
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

const ACTION_BUTTON_SIZE = 40;
const ACTION_ROW_GAP = 12;
const ACTION_ROW_WIDTH = ACTION_BUTTON_SIZE * 2 + ACTION_ROW_GAP;
const FILTER_POPOVER_MAX_WIDTH = 360;
type FilterOption<Value extends string> = {
  label: string;
  value: Value;
};

type LibrarySearchControlsProps = LibrarySearchControlsVisibility & {
  availableTagFilters: string[];
  availabilityFilter: LibrarySearchAvailabilityFilter;
  currentFilesFolderName: string | null;
  entityFilter: LibrarySearchEntityFilter;
  filesSearchScope: LibraryFilesSearchScope;
  onClearSearch: () => void;
  onFilterActionPress: () => void;
  onSearch: () => void;
  onSearchActionPress: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectAvailabilityFilter: (value: LibrarySearchAvailabilityFilter) => void;
  onSelectEntityFilter: (value: LibrarySearchEntityFilter) => void;
  onSelectFilesSearchScope: (value: LibraryFilesSearchScope) => void;
  onSelectRecentSearchTerm: (value: string) => void;
  onToggleTagFilter: (value: string) => void;
  recentSearchTerms: string[];
  selectedView: SavedRehearsalLibraryView;
  selectedTagFilters: string[];
  searchQuery: string;
};

type LibrarySearchControlsActionsProps = Pick<
  LibrarySearchControlsProps,
  | 'availabilityFilter'
  | 'entityFilter'
  | 'isFilterPopoverVisible'
  | 'isSearchBarVisible'
  | 'onFilterActionPress'
  | 'selectedTagFilters'
  | 'onSearchActionPress'
> & {
  tone?: 'hero' | 'surface';
};

type LibrarySearchActionButtonProps = {
  accessibilityLabel: string;
  iconName: 'close' | 'magnify' | 'tune-variant';
  isFilled: boolean;
  onPress: () => void;
  tone: 'hero' | 'surface';
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
  tone,
}: LibrarySearchActionButtonProps) => {
  const isHeroTone = tone === 'hero';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        isHeroTone ? styles.actionButtonHero : styles.actionButtonSurface,
        isFilled
          ? isHeroTone
            ? styles.actionButtonFilledHero
            : styles.actionButtonFilledSurface
          : undefined,
        pressed ? styles.actionButtonPressed : undefined,
      ]}
    >
      <MaterialCommunityIcons
        color={
          isHeroTone
            ? isFilled
              ? '#173229'
              : '#fff8ef'
            : isFilled
              ? '#fff8ef'
              : '#305c4d'
        }
        name={iconName}
        size={18}
      />
    </Pressable>
  );
};

export const LibrarySearchControlsActions = ({
  availabilityFilter,
  entityFilter,
  isFilterPopoverVisible,
  isSearchBarVisible,
  onFilterActionPress,
  onSearchActionPress,
  selectedTagFilters,
  tone = 'surface',
}: LibrarySearchControlsActionsProps) => {
  const hasActiveFilters =
    entityFilter !== 'all' ||
    availabilityFilter !== 'all' ||
    selectedTagFilters.length > 0;

  return (
    <View style={styles.actionRow}>
      <LibrarySearchActionButton
        accessibilityLabel={
          isFilterPopoverVisible
            ? 'Hide library filters'
            : 'Show library filters'
        }
        iconName="tune-variant"
        isFilled={isFilterPopoverVisible || hasActiveFilters}
        onPress={onFilterActionPress}
        tone={tone}
      />
      <LibrarySearchActionButton
        accessibilityLabel={
          isSearchBarVisible ? 'Close search' : 'Search saved library'
        }
        iconName={isSearchBarVisible ? 'close' : 'magnify'}
        isFilled={true}
        onPress={onSearchActionPress}
        tone={tone}
      />
    </View>
  );
};

export const LibrarySearchControls = ({
  availableTagFilters,
  availabilityFilter,
  currentFilesFolderName,
  entityFilter,
  filesSearchScope,
  isFilterPopoverVisible,
  isSearchBarVisible,
  onClearSearch,
  onSearch,
  onSearchActionPress,
  onSearchQueryChange,
  onSelectAvailabilityFilter,
  onSelectEntityFilter,
  onSelectFilesSearchScope,
  onSelectRecentSearchTerm,
  onToggleTagFilter,
  recentSearchTerms,
  selectedView,
  selectedTagFilters,
  searchQuery,
}: LibrarySearchControlsProps) => {
  const searchContextCopy = getLibrarySearchContextCopy();
  const searchHelperCopy =
    selectedView === 'files'
      ? `${searchContextCopy.helper} Scope: ${
          filesSearchScope === 'current-folder'
            ? currentFilesFolderName
              ? `This folder (${currentFilesFolderName})`
              : 'This folder'
            : 'All Files'
        }`
      : searchContextCopy.helper;

  const searchPanel = isSearchBarVisible ? (
    <ContextualSearchPanel
      clearActionLabel="Show all saved items"
      helperCopy={searchHelperCopy}
      isSearchBarVisible={true}
      onClearSearch={onClearSearch}
      onSearch={onSearch}
      onSearchQueryChange={onSearchQueryChange}
      onToggleSearchBar={onSearchActionPress}
      onSelectRecentSearchTerm={onSelectRecentSearchTerm}
      placeholderCopy={searchContextCopy.placeholder}
      recentSearchTerms={recentSearchTerms}
      searchAccessibilityLabel="Search saved library"
      searchQuery={searchQuery}
      showInlineToggleButton={false}
    />
  ) : null;

  const filterPopover = isFilterPopoverVisible ? (
    <View style={styles.filterPopover}>
      {selectedView === 'files' ? (
        <FilterChipGroup
          label="Scope"
          onSelectValue={onSelectFilesSearchScope}
          options={buildFilesSearchScopeOptions(currentFilesFolderName)}
          selectedValue={filesSearchScope}
        />
      ) : null}
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
      {availableTagFilters.length > 0 ? (
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Tags</Text>
          <View style={styles.filterRow}>
            {availableTagFilters.map((tagFilter) => {
              return (
                <InteractionChip
                  key={tagFilter}
                  label={tagFilter}
                  onPress={() => {
                    onToggleTagFilter(tagFilter);
                  }}
                  style={styles.filterChip}
                  variant={
                    selectedTagFilters.includes(tagFilter)
                      ? 'selected'
                      : 'passive'
                  }
                />
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  ) : null;

  if (!searchPanel && !filterPopover) {
    return null;
  }

  return (
    <View style={styles.panelContent}>
      {filterPopover}
      {searchPanel}
    </View>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    width: ACTION_ROW_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: ACTION_BUTTON_SIZE,
    height: ACTION_BUTTON_SIZE,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionButtonFilledHero: {
    borderColor: '#fff8ef',
    backgroundColor: '#fff8ef',
  },
  actionButtonFilledSurface: {
    borderColor: '#305c4d',
    backgroundColor: '#305c4d',
  },
  actionButtonHero: {
    borderColor: 'rgba(255, 248, 239, 0.26)',
    backgroundColor: 'rgba(255, 248, 239, 0.08)',
  },
  actionButtonPressed: { opacity: 0.8 },
  actionButtonSurface: {
    borderColor: '#c8c0b2',
    backgroundColor: '#f7f1e7',
  },
  panelContent: {
    gap: 12,
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
