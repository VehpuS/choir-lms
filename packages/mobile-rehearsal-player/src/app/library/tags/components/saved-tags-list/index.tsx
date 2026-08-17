import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { appTheme } from '../../../../utils/theme';
import { InteractionChip } from '../../../components/interaction-chip';
import { ExplorerListRow, ExplorerListSurface } from '../../../components/explorer';
import { SearchHighlightedText } from '../../../search/components/search-highlighted-text';
import {
  DEFAULT_SAVED_TAGS_LIST_SORT_STATE,
  EMPTY_SAVED_TAGS_MESSAGE,
  NO_SAVED_TAGS_SEARCH_RESULTS_MESSAGE,
  SAVED_TAGS_LIST_SORT_FIELD_OPTIONS,
  filterSavedTagUsageByQuery,
  getSavedTagsListSortDirectionToggleLabel,
  getSavedTagUsageMetadataLabel,
  sortSavedTagUsage,
} from './model';

type SavedTagsListProps = {
  onSelectTag: (tag: string) => void;
  searchQuery: string | null;
  tagUsage: RehearsalLibraryTagUsage[];
};

export const SavedTagsList = ({
  onSelectTag,
  searchQuery,
  tagUsage,
}: SavedTagsListProps) => {
  const [sortState, setSortState] = useState(DEFAULT_SAVED_TAGS_LIST_SORT_STATE);
  const filteredTagUsage = useMemo(() => {
    return filterSavedTagUsageByQuery(tagUsage, searchQuery ?? '');
  }, [tagUsage, searchQuery]);
  const sortedTagUsage = useMemo(() => {
    return sortSavedTagUsage(filteredTagUsage, sortState);
  }, [filteredTagUsage, sortState]);

  if (tagUsage.length === 0) {
    return <Text style={styles.emptyMessage}>{EMPTY_SAVED_TAGS_MESSAGE}</Text>;
  }

  const directionToggleLabel = getSavedTagsListSortDirectionToggleLabel(
    sortState.direction,
  );

  return (
    <View style={styles.container}>
      <View style={styles.sortRow}>
        <View style={styles.sortChips}>
          {SAVED_TAGS_LIST_SORT_FIELD_OPTIONS.map((option) => {
            return (
              <InteractionChip
                key={option.value}
                label={option.label}
                onPress={() => {
                  setSortState((currentSortState) => {
                    return { ...currentSortState, field: option.value };
                  });
                }}
                variant={
                  sortState.field === option.value ? 'selected' : 'passive'
                }
              />
            );
          })}
        </View>
        <SurfaceIconButton
          accessibilityLabel={directionToggleLabel}
          icon={
            sortState.direction === 'asc' ? 'sort-ascending' : 'sort-descending'
          }
          onPress={() => {
            setSortState((currentSortState) => {
              return {
                ...currentSortState,
                direction:
                  currentSortState.direction === 'asc' ? 'desc' : 'asc',
              };
            });
          }}
          size={20}
        />
      </View>
      {sortedTagUsage.length === 0 ? (
        <Text style={styles.emptyMessage}>
          {NO_SAVED_TAGS_SEARCH_RESULTS_MESSAGE}
        </Text>
      ) : (
        <ExplorerListSurface>
          {sortedTagUsage.map((usage) => {
            return (
              <ExplorerListRow
                key={usage.tag}
                leadingIcon={
                  <MaterialCommunityIcons
                    color={appTheme.colors.secondaryText}
                    name="tag-outline"
                    size={22}
                  />
                }
                metadata={
                  <Text style={styles.rowSupportingLabel}>
                    {getSavedTagUsageMetadataLabel(usage)}
                  </Text>
                }
                onPress={() => {
                  onSelectTag(usage.tag);
                }}
                title={
                  <SearchHighlightedText
                    query={searchQuery}
                    style={styles.rowTitle}
                    text={usage.tag}
                  />
                }
              />
            );
          })}
        </ExplorerListSurface>
      )}
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
  sortChips: {
    flexDirection: 'row',
    gap: 8,
  },
  sortRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
});
