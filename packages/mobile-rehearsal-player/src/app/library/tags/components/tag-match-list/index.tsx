import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RehearsalLibraryTagMatch } from '@org/audio-library-runtime';
import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { appTheme } from '../../../../utils/theme';
import { ExplorerListRow, ExplorerListSurface } from '../../../components/explorer';
import {
  DEFAULT_TAG_MATCH_LIST_SORT_STATE,
  EMPTY_TAG_MATCH_LIST_MESSAGE,
  NO_TAG_MATCH_RESULTS_MESSAGE,
  getTagMatchIconName,
  getTagMatchKey,
  getTagMatchMetadataLabel,
  getTagMatchTitle,
  sortTagMatches,
  type TagMatchListSortState,
} from './model';

type TagMatchListProps = {
  hasUnfilteredMatches: boolean;
  matches: RehearsalLibraryTagMatch[];
  sortState?: TagMatchListSortState;
};

export const TagMatchList = ({
  hasUnfilteredMatches,
  matches,
  sortState = DEFAULT_TAG_MATCH_LIST_SORT_STATE,
}: TagMatchListProps) => {
  const sortedMatches = useMemo(() => {
    return sortTagMatches(matches, sortState);
  }, [matches, sortState]);

  if (!hasUnfilteredMatches) {
    return <Text style={styles.emptyMessage}>{EMPTY_TAG_MATCH_LIST_MESSAGE}</Text>;
  }

  if (sortedMatches.length === 0) {
    return <Text style={styles.emptyMessage}>{NO_TAG_MATCH_RESULTS_MESSAGE}</Text>;
  }

  return (
    <ExplorerListSurface>
      {sortedMatches.map((match) => {
        return (
          <ExplorerListRow
            key={getTagMatchKey(match)}
            leadingIcon={
              <MaterialCommunityIcons
                color={appTheme.colors.secondaryText}
                name={getTagMatchIconName(match)}
                size={22}
              />
            }
            metadata={
              <Text style={styles.rowSupportingLabel}>
                {getTagMatchMetadataLabel(match)}
              </Text>
            }
            title={<Text style={styles.rowTitle}>{getTagMatchTitle(match)}</Text>}
          />
        );
      })}
    </ExplorerListSurface>
  );
};

const styles = StyleSheet.create({
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
