import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../../utils/theme';
import { ExplorerListRow, ExplorerListSurface } from '../../../components/explorer';
import { SearchHighlightedText } from '../../../search/components/search-highlighted-text';
import {
  EMPTY_SAVED_TAGS_MESSAGE,
  NO_SAVED_TAGS_SEARCH_RESULTS_MESSAGE,
  filterSavedTagUsageByQuery,
  getSavedTagUsageRowMetadataLabel,
  sortSavedTagUsage,
  type SavedTagsListSortState,
} from './model';

type SavedTagsListProps = {
  onSelectTag: (tag: string) => void;
  searchQuery: string | null;
  sortState: SavedTagsListSortState;
  tagUsage: RehearsalLibraryTagUsage[];
};

export const SavedTagsList = ({
  onSelectTag,
  searchQuery,
  sortState,
  tagUsage,
}: SavedTagsListProps) => {
  const filteredTagUsage = useMemo(() => {
    return filterSavedTagUsageByQuery(tagUsage, searchQuery ?? '');
  }, [tagUsage, searchQuery]);
  const sortedTagUsage = useMemo(() => {
    return sortSavedTagUsage(filteredTagUsage, sortState);
  }, [filteredTagUsage, sortState]);

  if (tagUsage.length === 0) {
    return <Text style={styles.emptyMessage}>{EMPTY_SAVED_TAGS_MESSAGE}</Text>;
  }

  return (
    <View style={styles.container}>
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
                    {getSavedTagUsageRowMetadataLabel(usage)}
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
});
