import { StyleSheet, Text, View } from 'react-native';

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
  {
    label: 'All',
    value: 'all',
  },
  {
    label: 'Tracks',
    value: 'tracks',
  },
  {
    label: 'Loops',
    value: 'loops',
  },
  {
    label: 'Playlists',
    value: 'playlists',
  },
];

const AVAILABILITY_FILTER_OPTIONS: {
  label: string;
  value: LibrarySearchAvailabilityFilter;
}[] = [
  {
    label: 'Any status',
    value: 'all',
  },
  {
    label: 'Playable',
    value: 'available',
  },
  {
    label: 'Unavailable',
    value: 'unavailable',
  },
];

type LibrarySearchPanelProps = {
  availabilityFilter: LibrarySearchAvailabilityFilter;
  entityFilter: LibrarySearchEntityFilter;
  isSearchMode: boolean;
  onClearSearch: () => void;
  onSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectAvailabilityFilter: (value: LibrarySearchAvailabilityFilter) => void;
  onSelectEntityFilter: (value: LibrarySearchEntityFilter) => void;
  onSelectRecentSearchTerm: (value: string) => void;
  recentSearchTerms: string[];
  searchQuery: string;
};

export const LibrarySearchPanel = ({
  availabilityFilter,
  entityFilter,
  isSearchMode,
  onClearSearch,
  onSearch,
  onSearchQueryChange,
  onSelectAvailabilityFilter,
  onSelectEntityFilter,
  onSelectRecentSearchTerm,
  recentSearchTerms,
  searchQuery,
}: LibrarySearchPanelProps) => {
  const searchContextCopy = getLibrarySearchContextCopy();

  return (
    <View style={styles.searchPanel}>
      <ContextualSearchPanel
        clearActionLabel="Show all saved items"
        helperCopy={searchContextCopy.helper}
        isSearchMode={isSearchMode}
        onClearSearch={onClearSearch}
        onSearch={onSearch}
        onSearchQueryChange={onSearchQueryChange}
        onSelectRecentSearchTerm={onSelectRecentSearchTerm}
        placeholderCopy={searchContextCopy.placeholder}
        recentSearchTerms={recentSearchTerms}
        searchAccessibilityLabel="Search saved library"
        searchQuery={searchQuery}
      />
      {isSearchMode ? (
        <View style={styles.filterSection}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Show</Text>
            <View style={styles.filterRow}>
              {ENTITY_FILTER_OPTIONS.map((option) => {
                return (
                  <InteractionChip
                    key={option.value}
                    label={option.label}
                    onPress={() => {
                      onSelectEntityFilter(option.value);
                    }}
                    style={styles.filterChip}
                    variant={
                      entityFilter === option.value ? 'selected' : 'passive'
                    }
                  />
                );
              })}
            </View>
          </View>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Availability</Text>
            <View style={styles.filterRow}>
              {AVAILABILITY_FILTER_OPTIONS.map((option) => {
                return (
                  <InteractionChip
                    key={option.value}
                    label={option.label}
                    onPress={() => {
                      onSelectAvailabilityFilter(option.value);
                    }}
                    style={styles.filterChip}
                    variant={
                      availabilityFilter === option.value
                        ? 'selected'
                        : 'passive'
                    }
                  />
                );
              })}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  searchPanel: {
    gap: 12,
  },
  filterSection: {
    gap: 10,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    color: '#5f5647',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
