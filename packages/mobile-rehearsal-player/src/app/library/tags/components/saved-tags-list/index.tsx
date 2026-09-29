import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../../components/app-icon';
import { RowMetaLine } from '../../../../components/row-meta-line';
import { appTheme } from '../../../../utils/theme';
import {
  ExplorerListRow,
  ExplorerListSurface,
} from '../../../components/explorer';
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
                  <AppIcon
                    color={appTheme.colors.icon}
                    name="tag-outline"
                    size={LEADING_GLYPH_SIZE}
                  />
                }
                metadata={
                  <RowMetaLine text={getSavedTagUsageRowMetadataLabel(usage)} />
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

const LEADING_GLYPH_SIZE = 20;

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  emptyMessage: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
    lineHeight: 20,
  },
  rowTitle: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
});
