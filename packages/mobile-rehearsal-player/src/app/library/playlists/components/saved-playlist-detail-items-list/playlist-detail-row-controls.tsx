import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CompactPlaybackAction } from '../../../../components/compact-playback-action';
import { OverflowMenuTrigger } from '../../../../components/overflow-menu-trigger';
import { RowMetaLine } from '../../../../components/row-meta-line';
import { OptionsMenuSheet } from '../../../components/options-menu-sheet';
import { savedPlaylistSectionStyles as styles } from '../../../components/saved-playlist-section-styles';
import { getPlaylistDetailRowControlState } from './playlist-detail-row-controls-model';

export const PlaylistDetailRowControls = (props: {
  entryId: string;
  entryTitle: string;
  isCurrentEntry: boolean;
  isItemPlayable: boolean;
  isMenuVisible: boolean;
  isMutating: boolean;
  itemCount: number;
  metadataLabel: string;
  onCloseMenu: () => void;
  /** Long-press on the row's copy enters selection mode (task 9.8). */
  onLongPressRow?: () => void;
  onPlayItem: () => void;
  onRemoveItem: (entryId: string) => void;
  onRequestMoveToPosition: (entryId: string) => void;
  onShowMenu: () => void;
  onToggleCurrentPlayback: () => void;
  playbackToggleDisabled: boolean;
  playbackToggleLabel: string;
  /** The arrows and drag handle from the shared reorderable list. */
  reorderControls: ReactNode;
}) => {
  const controlState = getPlaylistDetailRowControlState({
    entryId: props.entryId,
    entryTitle: props.entryTitle,
    isCurrentEntry: props.isCurrentEntry,
    isItemPlayable: props.isItemPlayable,
    isMutating: props.isMutating,
    itemCount: props.itemCount,
    playbackToggleDisabled: props.playbackToggleDisabled,
    playbackToggleLabel: props.playbackToggleLabel,
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
        {props.reorderControls}
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
