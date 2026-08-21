import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { RehearsalLibraryTagMatch } from '@org/audio-library-runtime';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../../utils/theme';
import { ExplorerListRow, ExplorerListSurface } from '../../../components/explorer';
import {
  DEFAULT_TAG_MATCH_LIST_SORT_STATE,
  EMPTY_TAG_MATCH_LIST_MESSAGE,
  NO_TAG_MATCH_RESULTS_MESSAGE,
  getTagMatchIconName,
  getTagMatchKey,
  getTagMatchListSectionTitle,
  getTagMatchMetadataLabel,
  getTagMatchNavigationTarget,
  getTagMatchTitle,
  sortTagMatches,
  type TagMatchListSortState,
} from './model';

type TagMatchListProps = {
  hasUnfilteredMatches: boolean;
  matches: RehearsalLibraryTagMatch[];
  onOpenFolder: (folderId: string) => void;
  onOpenPlaylist: (playlistId: string) => void;
  sortState?: TagMatchListSortState;
};

export const TagMatchList = ({
  hasUnfilteredMatches,
  matches,
  onOpenFolder,
  onOpenPlaylist,
  sortState = DEFAULT_TAG_MATCH_LIST_SORT_STATE,
}: TagMatchListProps) => {
  const sortedMatches = useMemo(() => {
    return sortTagMatches(matches, sortState);
  }, [matches, sortState]);

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>
        {getTagMatchListSectionTitle(sortedMatches.length)}
      </Text>
      {!hasUnfilteredMatches ? (
        <Text style={styles.emptyMessage}>{EMPTY_TAG_MATCH_LIST_MESSAGE}</Text>
      ) : sortedMatches.length === 0 ? (
        <Text style={styles.emptyMessage}>{NO_TAG_MATCH_RESULTS_MESSAGE}</Text>
      ) : (
        <ExplorerListSurface>
          {sortedMatches.map((match) => {
            const navigationTarget = getTagMatchNavigationTarget(match);
            const onPress =
              navigationTarget?.kind === 'folder'
                ? () => onOpenFolder(navigationTarget.folderId)
                : navigationTarget?.kind === 'playlist'
                  ? () => onOpenPlaylist(navigationTarget.playlistId)
                  : undefined;

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
                onPress={onPress}
                title={
                  <Text style={styles.rowTitle}>{getTagMatchTitle(match)}</Text>
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
  emptyMessage: {
    color: appTheme.colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  group: {
    gap: 12,
  },
  groupTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 16,
    fontWeight: '700',
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
