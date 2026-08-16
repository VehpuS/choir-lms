import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { appTheme } from '../../../../utils/theme';
import { InteractionChip } from '../../../components/interaction-chip';
import { ExplorerListRow, ExplorerListSurface } from '../../../components/explorer';
import {
  DEFAULT_SAVED_TAGS_LIST_SORT_STATE,
  EMPTY_SAVED_TAGS_MESSAGE,
  SAVED_TAGS_LIST_SORT_FIELD_OPTIONS,
  getSavedTagsListSortDirectionToggleLabel,
  getSavedTagUsageMetadataLabel,
  sortSavedTagUsage,
} from './model';

type SavedTagsListProps = {
  tagUsage: RehearsalLibraryTagUsage[];
};

export const SavedTagsList = ({ tagUsage }: SavedTagsListProps) => {
  const [sortState, setSortState] = useState(DEFAULT_SAVED_TAGS_LIST_SORT_STATE);
  const sortedTagUsage = useMemo(() => {
    return sortSavedTagUsage(tagUsage, sortState);
  }, [tagUsage, sortState]);

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
              title={<Text style={styles.rowTitle}>{usage.tag}</Text>}
            />
          );
        })}
      </ExplorerListSurface>
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
