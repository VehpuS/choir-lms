import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createTrackPlayableItem } from '@org/audio-library-models';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OverflowMenuTrigger } from '../../../components/overflow-menu-trigger';
import { RowPreparingIndicator } from '../../../components/row-preparing-indicator';
import { appTheme } from '../../../utils/theme';
import { resolveDriveLibrarySourceActionPlacement } from '../../drive/utils/drive-library-source-actions';
import {
  getSourceMetadataLabels,
  getSourceStatusMessage,
} from '../../drive/utils/drive-library-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  isSavedTrackPlaybackActive,
} from '../../playback/utils/saved-track-playback-view-model';
import { resolveSavedTrackRowActions } from '../../playback/utils/saved-track-row-actions';
import { SearchHighlightedText } from '../../search/components/search-highlighted-text';
import {
  getSavedRehearsalLibraryDependentLoops,
  getSavedRehearsalLibrarySourceIssue,
} from '../../saved-rehearsal-library/view-model';
import { ExplorerListRow, ExplorerListSurface } from '../explorer';
import { OptionsMenuSheet } from '../options-menu-sheet';
import { attachRowActionSections } from '../options-menu-sheet/row-action-sections';
import {
  TRACK_ACTION_ORDER,
  sortActionsByLabelOrder,
  toOptionsMenuAction,
} from './files-row-actions-contract';
import type { SavedRehearsalLibrarySectionProps } from './types';

type BrowseSourceGroupProps = Pick<
  SavedRehearsalLibrarySectionProps,
  | 'activePlayableItem'
  | 'canMutateLibrary'
  | 'canMutateLoops'
  | 'canMutatePlaylists'
  | 'isPlaybackPreparing'
  | 'playbackIssue'
  | 'playbackState'
  | 'queuePlayableItemNext'
  | 'queuePlayableItemUpNext'
  | 'removeSource'
  | 'savedLibraryIssue'
  | 'savedLoops'
  | 'toggleSourcePlayback'
> & {
  canQueueAsNext: boolean;
  isLoopMutating: boolean;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  onOpenLoopBuilderForSource: SavedRehearsalLibrarySectionProps['openLoopBuilderForSource'];
  onOpenSourceTagEditor: (
    source: SavedRehearsalLibrarySectionProps['savedLibrarySources'][number],
  ) => void;
  openTrackLoopView: (sourceId: string) => void;
  openSourcePlaylistSelector: (sourceId: string) => void;
  pendingLoopBuilderSourceId: string | null;
  pendingSourceId: string | null;
  savedSourceTitle: string;
  searchQuery: string | null;
  sources: SavedRehearsalLibrarySectionProps['savedLibrarySources'];
};

export const BrowseSourceGroup = ({
  activePlayableItem,
  canMutateLibrary,
  canMutateLoops,
  canMutatePlaylists,
  canQueueAsNext,
  isLoopMutating,
  isPlaybackPreparing,
  isPlaylistMutating,
  isSavedLibraryMutating,
  onOpenLoopBuilderForSource,
  onOpenSourceTagEditor,
  openSourcePlaylistSelector,
  openTrackLoopView,
  pendingLoopBuilderSourceId,
  pendingSourceId,
  playbackIssue,
  playbackState,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  removeSource,
  savedLibraryIssue,
  savedLoops,
  savedSourceTitle,
  searchQuery,
  sources,
  toggleSourcePlayback,
}: BrowseSourceGroupProps) => {
  const [openMenuSourceId, setOpenMenuSourceId] = useState<string | null>(
    null,
  );

  if (sources.length === 0) {
    return null;
  }

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{savedSourceTitle}</Text>
      <ExplorerListSurface>
        {sources.map((source) => {
          const isPending = pendingSourceId === source.id;
          const trackPlayableItem = createTrackPlayableItem(source);
          const playbackAction = getSavedTrackPlaybackActionCopy({
            activePlayableItem,
            isPreparing: isPlaybackPreparing,
            playableItem: trackPlayableItem,
            playbackState,
          });
          const isPlaybackSourceActive = isSavedTrackPlaybackActive(
            activePlayableItem,
            trackPlayableItem,
          );
          const isAvailable = source.availability.status === 'available';
          const isPreparingLoop = pendingLoopBuilderSourceId === source.id;
          const externalMessage =
            getSavedRehearsalLibrarySourceIssue(
              savedLibraryIssue,
              source,
              'remove',
            ) ??
            getSavedTrackPlaybackItemIssue(playbackIssue, trackPlayableItem);
          const statusMessage =
            externalMessage ?? getSourceStatusMessage(source);
          const metadataLabel = getSourceMetadataLabels(source).join(' • ');
          const menuActions = sortActionsByLabelOrder(
            resolveSavedTrackRowActions({
              canMutateLibrary,
              canMutateLoops,
              canMutatePlaylists,
              canQueueAsNext,
              hasAvailableSource: isAvailable,
              hasSavedLoops:
                getSavedRehearsalLibraryDependentLoops(savedLoops, source.id)
                  .length > 0,
              isLoopBuilderPreparing: pendingLoopBuilderSourceId !== null,
              isLoopMutating,
              isPendingLoopSource: pendingLoopBuilderSourceId === source.id,
              isPendingRemoval: isPending,
              isPlaybackSourceActive,
              isPlaylistMutating,
              isSavedLibraryMutating,
              onOpenLoopBuilder: () => {
                onOpenLoopBuilderForSource(source);
              },
              onOpenPlaylistSelector: () => {
                openSourcePlaylistSelector(source.id);
              },
              onOpenTagEditor: () => {
                onOpenSourceTagEditor(source);
              },
              onQueueNext: () => {
                queuePlayableItemNext(trackPlayableItem);
              },
              onQueueUpNext: () => {
                queuePlayableItemUpNext(trackPlayableItem);
              },
              onRemove: () => {
                removeSource(source);
              },
              onTogglePlayback: () => {
                void toggleSourcePlayback(source);
              },
              onViewTrackLoops: () => {
                openTrackLoopView(source.id);
              },
              playbackAction,
              sourceName: source.name,
            }),
            TRACK_ACTION_ORDER,
          ).filter((action) => {
            return (
              resolveDriveLibrarySourceActionPlacement(action) === 'menu'
            );
          });
          const sheetActions = attachRowActionSections(
            menuActions.map((action, index) => {
              return toOptionsMenuAction({
                action,
                id: `${source.id}:${action.accessibilityLabel ?? action.label}:${index}`,
              });
            }),
          );

          return (
            <View key={source.id}>
              <ExplorerListRow
                active={isPlaybackSourceActive}
                disabled={!isAvailable}
                leadingIcon={
                  <MaterialCommunityIcons
                    color={
                      isPlaybackSourceActive
                        ? '#173229'
                        : appTheme.colors.secondaryText
                    }
                    name="music-note-outline"
                    size={22}
                  />
                }
                message={
                  isPreparingLoop ? (
                    <RowPreparingIndicator label="Preparing loop…" />
                  ) : statusMessage ? (
                    <Text numberOfLines={2} style={styles.rowMessage}>
                      {statusMessage}
                    </Text>
                  ) : null
                }
                metadata={
                  metadataLabel ? (
                    <Text numberOfLines={1} style={styles.rowSupportingLabel}>
                      {metadataLabel}
                    </Text>
                  ) : null
                }
                onPress={() => {
                  void toggleSourcePlayback(source);
                }}
                overflowTrigger={
                  menuActions.length > 0 ? (
                    <OverflowMenuTrigger
                      accessibilityLabel={`${source.name} options`}
                      iconColor={appTheme.colors.secondaryText}
                      onPress={() => {
                        setOpenMenuSourceId(source.id);
                      }}
                      style={styles.rowOverflowTrigger}
                    />
                  ) : null
                }
                title={
                  <SearchHighlightedText
                    numberOfLines={1}
                    query={searchQuery}
                    style={styles.rowTitle}
                    text={source.name}
                  />
                }
              />
              <OptionsMenuSheet
                actions={sheetActions.map((action) => {
                  return {
                    ...action,
                    onPress: () => {
                      setOpenMenuSourceId(null);
                      action.onPress();
                    },
                  };
                })}
                isVisible={openMenuSourceId === source.id}
                onClose={() => {
                  setOpenMenuSourceId(null);
                }}
                title={source.name}
              />
            </View>
          );
        })}
      </ExplorerListSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    gap: 12,
  },
  groupTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 18,
    fontWeight: '700',
  },
  rowMessage: {
    color: '#9a4d2d',
    fontSize: 12,
    lineHeight: 17,
  },
  rowOverflowTrigger: {
    position: 'relative',
    right: 0,
    top: 0,
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
