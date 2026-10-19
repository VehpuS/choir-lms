import { Pressable, Text, View } from 'react-native';

import { CompactPlaybackAction } from '../../../../components/compact-playback-action';
import { OverflowMenuTrigger } from '../../../../components/overflow-menu-trigger';
import {
  ReorderControls,
  useDragReorder,
} from '../../../../components/reorderable-list';
import { RowMetaLine } from '../../../../components/row-meta-line';
import { OptionsMenuSheet } from '../../../components/options-menu-sheet';
import { savedPlaylistSectionStyles as styles } from '../../../components/saved-playlist-section-styles';
import { getPlaylistDetailRowControlState } from './playlist-detail-row-controls-model';

export const PlaylistDetailRowControls = (props: {
  entryId: string;
  entryTitle: string;
  getCurrentScrollOffsetY: () => number;
  getEntryIndex: () => number;
  index: number;
  isCurrentEntry: boolean;
  isItemPlayable: boolean;
  isMenuVisible: boolean;
  isMutating: boolean;
  itemCount: number;
  itemHeight: number;
  metadataLabel: string;
  onCloseMenu: () => void;
  onCommitReorder: () => void;
  /** Long-press on the row's copy enters selection mode (task 9.8). */
  onLongPressRow?: () => void;
  onMoveItem: (
    fromIndex: number,
    toIndex: number,
    options?: { persist?: boolean },
  ) => void;
  onPlayItem: () => void;
  onRemoveItem: (entryId: string) => void;
  onReorderDragActiveChange: (isActive: boolean) => void;
  onReorderDragMove: (moveY: number) => void;
  onRequestMoveToPosition: (entryId: string) => void;
  onShowMenu: () => void;
  onToggleCurrentPlayback: () => void;
  playbackToggleDisabled: boolean;
  playbackToggleLabel: string;
}) => {
  const controlState = getPlaylistDetailRowControlState({
    entryId: props.entryId,
    entryTitle: props.entryTitle,
    index: props.index,
    isCurrentEntry: props.isCurrentEntry,
    isItemPlayable: props.isItemPlayable,
    isMutating: props.isMutating,
    itemCount: props.itemCount,
    playbackToggleDisabled: props.playbackToggleDisabled,
    playbackToggleLabel: props.playbackToggleLabel,
  });

  const { panHandlers } = useDragReorder({
    canDrag: controlState.canDragReorder,
    getIndex: props.getEntryIndex,
    getScrollOffsetY: props.getCurrentScrollOffsetY,
    itemCount: props.itemCount,
    itemHeight: props.itemHeight,
    onActiveChange: props.onReorderDragActiveChange,
    onCommit: props.onCommitReorder,
    onDragMove: props.onReorderDragMove,
    onMove: props.onMoveItem,
  });

  return (
    <>
      <View style={styles.playlistRowShell}>
        <CompactPlaybackAction
          accessibilityLabel={controlState.playbackAction.accessibilityLabel}
          disabled={controlState.isPlaybackButtonDisabled}
          iconName={controlState.playbackAction.iconName}
          onPress={
            controlState.playbackAction.pressBehavior === 'toggle-current'
              ? props.onToggleCurrentPlayback
              : props.onPlayItem
          }
          variant="row"
        />
        <Pressable
          accessibilityRole="none"
          onLongPress={props.onLongPressRow}
          style={styles.playlistRowCopy}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.itemTitle,
              props.isCurrentEntry ? styles.itemTitleCurrent : undefined,
            ]}
          >
            {props.entryTitle}
          </Text>
          <RowMetaLine
            leading={
              controlState.rowStatusLabel !== 'Ready' ? (
                <Text
                  style={
                    props.isCurrentEntry
                      ? styles.itemStatusActive
                      : styles.itemStatusUnavailable
                  }
                >
                  {controlState.rowStatusLabel}
                </Text>
              ) : null
            }
            text={props.metadataLabel}
          />
        </Pressable>
        <ReorderControls
          canDrag={controlState.canDragReorder}
          disabled={props.isMutating}
          index={props.index}
          itemCount={props.itemCount}
          label={props.entryTitle}
          // Arrows save at once; a drag saves when it is released.
          onMove={(from, to) => props.onMoveItem(from, to, { persist: true })}
          panHandlers={panHandlers}
        />
        <OverflowMenuTrigger
          accessibilityLabel={`More actions for ${props.entryTitle}`}
          disabled={props.isMutating}
          onPress={props.onShowMenu}
          style={styles.playlistRowOverflowTrigger}
        />
      </View>

      <OptionsMenuSheet
        actions={controlState.menuActions.map((action) => ({
          ...action,
          onPress: () => {
            props.onCloseMenu();

            if (action.kind === 'move-to-position') {
              props.onRequestMoveToPosition(props.entryId);
              return;
            }

            props.onRemoveItem(props.entryId);
          },
        }))}
        isVisible={props.isMenuVisible}
        onClose={props.onCloseMenu}
        title={props.entryTitle}
      />
    </>
  );
};
