import { createTrackPlayableItem } from '@org/audio-library-models';
import { StyleSheet, Text, View } from 'react-native';

import { EqualizerMark } from '../../../components/equalizer-mark';
import { OverflowMenuTrigger } from '../../../components/overflow-menu-trigger';
import { RowMetaLine } from '../../../components/row-meta-line';
import { RowPreparingIndicator } from '../../../components/row-preparing-indicator';
import { appTheme } from '../../../utils/theme';
import { resolveDriveLibrarySourceActionPlacement } from '../../drive/utils/drive-library-source-actions';
import {
  formatDurationLabel,
  getSourceStatusMessage,
} from '../../drive/utils/drive-library-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  isSavedTrackPlaybackActive,
} from '../../playback/utils/saved-track-playback-view-model';
import { resolveSavedTrackRowActions } from '../../playback/utils/saved-track-row-actions';
import { SearchHighlightedText } from '../../search/components/search-highlighted-text';
import { getSavedRehearsalLibrarySourceIssue } from '../../saved-rehearsal-library/view-model';
import { ExplorerListRow } from '../explorer';
import { OptionsMenuSheet } from '../options-menu-sheet';
import { attachRowActionSections } from '../options-menu-sheet/row-action-sections';
import {
  formatTracksRowIndex,
  formatTracksRowMeta,
} from './browse-source-row-model';
import {
  TRACK_ACTION_ORDER,
  sortActionsByLabelOrder,
  toOptionsMenuAction,
} from './files-row-actions-contract';
import type { SavedRehearsalLibrarySectionProps } from './types';

export type BrowseSourceRowSharedProps = Pick<
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
  searchQuery: string | null;
};

type BrowseSourceRowProps = BrowseSourceRowSharedProps & {
  index: number;
  isMenuOpen: boolean;
  loopCount: number;
  onCloseMenu: () => void;
  onOpenMenu: () => void;
  source: SavedRehearsalLibrarySectionProps['savedLibrarySources'][number];
};

// Row anatomy from screen 1c: a mono index, title over tags / loop count, the
// equalizer mark while playing, a mono duration, and the overflow trigger.
export const BrowseSourceRow = ({
  activePlayableItem,
  canMutateLibrary,
  canMutateLoops,
  canMutatePlaylists,
  canQueueAsNext,
  index,
  isLoopMutating,
  isMenuOpen,
  isPlaybackPreparing,
  isPlaylistMutating,
  isSavedLibraryMutating,
  loopCount,
  onCloseMenu,
  onOpenLoopBuilderForSource,
  onOpenMenu,
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
  searchQuery,
  source,
  toggleSourcePlayback,
}: BrowseSourceRowProps) => {
  const trackPlayableItem = createTrackPlayableItem(source);
  const playbackAction = getSavedTrackPlaybackActionCopy({
    activePlayableItem,
    isPreparing: isPlaybackPreparing,
    playableItem: trackPlayableItem,
    playbackState,
  });
  const isActive = isSavedTrackPlaybackActive(
    activePlayableItem,
    trackPlayableItem,
  );
  const isPlaying = isActive && playbackState === 'playing';
  const isAvailable = source.availability.status === 'available';
  const statusMessage =
    getSavedRehearsalLibrarySourceIssue(savedLibraryIssue, source, 'remove') ??
    getSavedTrackPlaybackItemIssue(playbackIssue, trackPlayableItem) ??
    getSourceStatusMessage(source);
  const durationLabel = formatDurationLabel(source.durationMs);
  const menuActions = sortActionsByLabelOrder(
    resolveSavedTrackRowActions({
      canMutateLibrary,
      canMutateLoops,
      canMutatePlaylists,
      canQueueAsNext,
      hasAvailableSource: isAvailable,
      hasSavedLoops: loopCount > 0,
      isLoopBuilderPreparing: pendingLoopBuilderSourceId !== null,
      isLoopMutating,
      isPendingLoopSource: pendingLoopBuilderSourceId === source.id,
      isPendingRemoval: pendingSourceId === source.id,
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
    return resolveDriveLibrarySourceActionPlacement(action) === 'menu';
  });
  const sheetActions = attachRowActionSections(
    menuActions.map((action, actionIndex) => {
      return toOptionsMenuAction({
        action,
        id: `${source.id}:${action.accessibilityLabel ?? action.label}:${actionIndex}`,
      });
    }),
  );

  return (
    <View>
      <ExplorerListRow
        actions={
          <>
            {isPlaying ? <EqualizerMark style={styles.equalizer} /> : null}
            {durationLabel ? (
              <Text style={styles.duration}>{durationLabel}</Text>
            ) : null}
          </>
        }
        disabled={!isAvailable}
        leadingIcon={
          <Text
            style={[styles.index, isActive ? styles.indexActive : undefined]}
          >
            {formatTracksRowIndex(index)}
          </Text>
        }
        message={
          pendingLoopBuilderSourceId === source.id ? (
            <RowPreparingIndicator label="Preparing loop…" />
          ) : statusMessage ? (
            <Text numberOfLines={2} style={styles.rowMessage}>
              {statusMessage}
            </Text>
          ) : null
        }
        metadata={
          <RowMetaLine text={formatTracksRowMeta({ loopCount, source })} />
        }
        onPress={() => {
          void toggleSourcePlayback(source);
        }}
        overflowTrigger={
          menuActions.length > 0 ? (
            <OverflowMenuTrigger
              accessibilityLabel={`${source.name} options`}
              onPress={onOpenMenu}
              style={styles.rowOverflowTrigger}
            />
          ) : null
        }
        title={
          <SearchHighlightedText
            numberOfLines={1}
            query={searchQuery}
            style={[styles.rowTitle, isActive ? styles.rowTitleActive : null]}
            text={source.name}
          />
        }
      />
      <OptionsMenuSheet
        actions={sheetActions.map((action) => {
          return {
            ...action,
            onPress: () => {
              onCloseMenu();
              action.onPress();
            },
          };
        })}
        isVisible={isMenuOpen}
        onClose={onCloseMenu}
        title={source.name}
      />
    </View>
  );
};

// Fills the explorer's 20pt leading slot; right-aligned so 9 and 10 line up.
const INDEX_COLUMN_WIDTH = 20;
const EQUALIZER_GAP = 10;

const styles = StyleSheet.create({
  duration: {
    ...appTheme.type.timecode,
    fontSize: 12,
  },
  equalizer: {
    width: undefined,
    marginRight: EQUALIZER_GAP,
  },
  index: {
    width: INDEX_COLUMN_WIDTH,
    color: appTheme.colors.textFaint,
    fontFamily: appTheme.fontFamily.mono,
    fontSize: 12,
    textAlign: 'right',
  },
  indexActive: {
    color: appTheme.colors.accentText,
  },
  rowMessage: {
    color: appTheme.colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },
  rowOverflowTrigger: {
    position: 'relative',
    right: 0,
    top: 0,
  },
  rowTitle: {
    ...appTheme.type.rowTitle,
    color: appTheme.colors.text,
  },
  rowTitleActive: {
    color: appTheme.colors.accentText,
  },
});
