import type {
  PlayableItem,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import {
  resolveRehearsalLibraryTagMatches,
  type RehearsalLibraryEntityCollections,
} from '@org/audio-library-runtime';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DriveSessionMenu } from '../../../../auth/google-drive/components/drive-session-menu';
import type { DriveSessionMenuController } from '../../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import { CompactPlaybackAction } from '../../../../components/compact-playback-action';
import { DestinationHeader } from '../../../../components/destination-header';
import { getDestinationHeaderModel } from '../../../../components/destination-header-model';
import { appTheme } from '../../../../utils/theme';
import { ExplorerNavigationBar } from '../../../components/explorer';
import { ContextualSearchPanel } from '../../../search/components/contextual-search-panel';
import { LibrarySearchControlsActions } from '../../../search/components/library-search-controls-actions';
import { TagMatchControlsPanel } from '../tag-match-list/controls-panel';
import { TagMatchList } from '../tag-match-list';
import {
  DEFAULT_TAG_MATCH_LIST_SORT_STATE,
  filterTagMatchesByQuery,
  filterTagMatchesByType,
  type TagMatchListSortState,
  type TagMatchTypeFilterValue,
} from '../tag-match-list/model';
import { resolveTagQueuePlayableItems } from '../../utils/tag-queue-playback';

const TAG_DETAIL_EYEBROW = 'Tag';

type TagDetailScreenProps = {
  authorization: DriveSessionMenuController;
  entityCollections: RehearsalLibraryEntityCollections;
  fileLinks: RehearsalLibraryFileLinkNode[];
  folders: RehearsalLibraryFolderNode[];
  onClose: () => void;
  onOpenFolder: (folderId: string) => void;
  onOpenPlaylist: (playlistId: string) => void;
  onPlayMatches: (items: PlayableItem[]) => void;
  tag: string;
};

const getTagPlayAccessibilityLabel = (tag: string) => {
  return `Play everything tagged "${tag}"`;
};

const getTagSearchHelperCopy = (tag: string) => {
  return `Search tracks, loops, playlists, and folders tagged "${tag}".`;
};

const getTagSearchPlaceholderCopy = (tag: string) => {
  return `Search "${tag}" matches`;
};

export const TagDetailScreen = ({
  authorization,
  entityCollections,
  fileLinks,
  folders,
  onClose,
  onOpenFolder,
  onOpenPlaylist,
  onPlayMatches,
  tag,
}: TagDetailScreenProps) => {
  const [isSessionMenuVisible, setIsSessionMenuVisible] = useState(false);
  const [isFilterPopoverVisible, setIsFilterPopoverVisible] = useState(false);
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<
    TagMatchTypeFilterValue[]
  >([]);
  const [sortState, setSortState] = useState<TagMatchListSortState>(
    DEFAULT_TAG_MATCH_LIST_SORT_STATE,
  );
  const matches = useMemo(() => {
    return resolveRehearsalLibraryTagMatches(tag, { entityCollections, folders });
  }, [tag, entityCollections, folders]);
  const visibleMatches = useMemo(() => {
    return filterTagMatchesByQuery(
      filterTagMatchesByType(matches, selectedTypeFilters),
      searchQuery,
    );
  }, [matches, selectedTypeFilters, searchQuery]);
  const playableItems = useMemo(() => {
    return resolveTagQueuePlayableItems(visibleMatches, {
      fileLinks,
      folders,
      loops: entityCollections.loops,
      sources: entityCollections.sources,
    });
  }, [visibleMatches, fileLinks, folders, entityCollections]);
  const headerModel = getDestinationHeaderModel('library');
  const hasActiveFilters = selectedTypeFilters.length > 0;

  return (
    <View style={styles.surface}>
      {isSessionMenuVisible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setIsSessionMenuVisible(false);
          }}
          style={styles.menuBackdrop}
        />
      ) : null}
      <DestinationHeader
        style={styles.destinationHeader}
        title={headerModel.title}
        trailingAction={
          <View style={styles.headerActionRow}>
            <CompactPlaybackAction
              accessibilityLabel={getTagPlayAccessibilityLabel(tag)}
              disabled={playableItems.length === 0}
              iconName="play"
              onPress={() => {
                onPlayMatches(playableItems);
              }}
              variant="row"
            />
            <LibrarySearchControlsActions
              canShowFilters
              closeSearchAccessibilityLabel="Close search"
              hasActiveFilters={hasActiveFilters}
              hideFiltersAccessibilityLabel="Hide sort and filter controls"
              isFilterPopoverVisible={isFilterPopoverVisible}
              isSearchBarVisible={isSearchBarVisible}
              onFilterActionPress={() => {
                setIsSessionMenuVisible(false);
                setIsFilterPopoverVisible((currentValue) => !currentValue);
              }}
              onSearchActionPress={() => {
                setIsSessionMenuVisible(false);
                setIsSearchBarVisible((currentValue) => !currentValue);
              }}
              searchAccessibilityLabel="Search this tag's matches"
              showFiltersAccessibilityLabel="Show sort and filter controls"
              tone="hero"
            />
            <DriveSessionMenu
              authState={authorization.authState}
              canClearAuthorization={authorization.canClearAuthorization}
              canStartAuthorization={authorization.canStartAuthorization}
              isBusy={authorization.isBusy}
              isVisible={isSessionMenuVisible}
              onClearAuthorization={() => {
                setIsSessionMenuVisible(false);
                void authorization.clearAuthorization();
              }}
              onStartAuthorization={() => {
                setIsSessionMenuVisible(false);
                void authorization.startAuthorization();
              }}
              onToggleVisibility={() => {
                setIsSessionMenuVisible((currentValue) => !currentValue);
              }}
              requestReady={authorization.requestReady}
              statusCopy={authorization.statusCopy}
            />
          </View>
        }
      />
      <ExplorerNavigationBar
        canGoBack
        eyebrow={TAG_DETAIL_EYEBROW}
        onGoBack={onClose}
        title={tag}
      />
      {isSearchBarVisible ? (
        <ContextualSearchPanel
          canShowRecentSearchTerms={false}
          clearActionLabel="Clear search"
          helperCopy={getTagSearchHelperCopy(tag)}
          isSearchBarVisible
          onClearSearch={() => {
            setSearchQuery('');
          }}
          onSearch={() => undefined}
          onSearchQueryChange={setSearchQuery}
          onSelectRecentSearchTerm={() => undefined}
          onToggleSearchBar={() => {
            setIsSearchBarVisible(false);
          }}
          placeholderCopy={getTagSearchPlaceholderCopy(tag)}
          recentSearchTerms={[]}
          searchAccessibilityLabel="Search this tag's matches"
          searchQuery={searchQuery}
          showInlineToggleButton={false}
        />
      ) : null}
      {isFilterPopoverVisible ? (
        <TagMatchControlsPanel
          onChangeSortState={setSortState}
          onToggleTypeFilter={(value) => {
            setSelectedTypeFilters((currentValue) => {
              return currentValue.includes(value)
                ? currentValue.filter((filterValue) => filterValue !== value)
                : [...currentValue, value];
            });
          }}
          selectedTypeFilters={selectedTypeFilters}
          sortState={sortState}
        />
      ) : null}
      <View style={styles.body}>
        <TagMatchList
          hasUnfilteredMatches={matches.length > 0}
          matches={visibleMatches}
          onOpenFolder={onOpenFolder}
          onOpenPlaylist={onOpenPlaylist}
          sortState={sortState}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    gap: 12,
    backgroundColor: appTheme.colors.pageBackground,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  destinationHeader: {
    marginTop: 12,
  },
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  body: {
    flex: 1,
  },
});
