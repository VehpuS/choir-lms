import type { RehearsalLibraryTagMatch } from '@org/audio-library-runtime';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../../components/app-icon';
import { RowMetaLine } from '../../../../components/row-meta-line';
import { appTheme } from '../../../../utils/theme';
import {
  ExplorerListRow,
  ExplorerListSurface,
} from '../../../components/explorer';
import { useLibraryEntitySelection } from '../../../selection/use-library-entity-selection';
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

  const selection = useLibraryEntitySelection({
    rows: useMemo(
      () =>
        sortedMatches.map((match) => ({
          id: match.item.id,
          kind: match.kind,
        })),
      [sortedMatches],
    ),
    surface: 'tag-detail',
  });

  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>
          {getTagMatchListSectionTitle(sortedMatches.length)}
        </Text>
        {selection.entryButton}
      </View>
      {selection.selectionBar}
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
                  <AppIcon
                    color={appTheme.colors.icon}
                    name={getTagMatchIconName(match)}
                    size={LEADING_GLYPH_SIZE}
                  />
                }
                metadata={
                  <RowMetaLine text={getTagMatchMetadataLabel(match)} />
                }
                onPress={onPress}
                selection={selection.getRowSelection({
                  id: match.item.id,
                  kind: match.kind,
                })}
                title={
                  <Text style={styles.rowTitle}>{getTagMatchTitle(match)}</Text>
                }
              />
            );
          })}
        </ExplorerListSurface>
      )}
      {selection.bulkNodes}
    </View>
  );
};

const LEADING_GLYPH_SIZE = 20;

const styles = StyleSheet.create({
  emptyMessage: {
    ...appTheme.type.body,
    color: appTheme.colors.textMuted,
    lineHeight: 20,
  },
  group: {
    gap: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupTitle: {
    ...appTheme.type.kicker,
    flex: 1,
    color: appTheme.colors.textMuted,
  },
  rowTitle: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
});
