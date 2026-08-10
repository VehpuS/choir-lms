import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useRef } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';

import { OverflowMenuTrigger } from '../../../../components/overflow-menu-trigger';
import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { OptionsMenuSheet } from '../../../components/options-menu-sheet';
import { savedPlaylistSectionStyles as styles } from '../../../components/saved-playlist-section-styles';
import { PLAYLIST_SECONDARY_TEXT } from '../../../components/saved-playlist-section-styles/shared';
import { getPlaylistDetailRowControlState } from './playlist-detail-row-controls-model';

const PLAYLIST_ROW_DRAG_ICON_SIZE = 15;
const PLAYLIST_ROW_STEP_ICON_SIZE = 12;
const PLAYLIST_ROW_PLAY_ICON_SIZE = 13;
const PLAYLIST_ROW_OVERFLOW_ICON_SIZE = 15;

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
  const dragAnchorMoveYRef = useRef<number | null>(null);
  const hasMovedDuringDragRef = useRef(false);
  const stepDistance = Math.max(props.itemHeight * 0.82, 44);
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

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => {
        return controlState.canDragReorder;
      },
      onStartShouldSetPanResponderCapture: () => {
        return controlState.canDragReorder;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return controlState.canDragReorder && Math.abs(gestureState.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return controlState.canDragReorder && Math.abs(gestureState.dy) > 5;
      },
      onPanResponderTerminationRequest: () => {
        return false;
      },
      onShouldBlockNativeResponder: () => {
        return true;
      },
      onPanResponderGrant: () => {
        props.onReorderDragActiveChange(true);
        dragAnchorMoveYRef.current = null;
        hasMovedDuringDragRef.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        props.onReorderDragMove(gestureState.moveY);

        if (!controlState.canDragReorder) {
          return;
        }

        const effectiveMoveY =
          gestureState.moveY + props.getCurrentScrollOffsetY();

        if (dragAnchorMoveYRef.current === null) {
          dragAnchorMoveYRef.current = effectiveMoveY;
          return;
        }

        let delta = effectiveMoveY - dragAnchorMoveYRef.current;

        while (Math.abs(delta) >= stepDistance) {
          const direction = delta > 0 ? 1 : -1;
          const currentIndex = props.getEntryIndex();

          if (currentIndex < 0) {
            break;
          }

          const nextIndex = Math.min(
            Math.max(currentIndex + direction, 0),
            props.itemCount - 1,
          );

          if (nextIndex === currentIndex) {
            break;
          }

          props.onMoveItem(currentIndex, nextIndex);
          hasMovedDuringDragRef.current = true;
          dragAnchorMoveYRef.current += direction * stepDistance;
          delta = effectiveMoveY - dragAnchorMoveYRef.current;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        props.onReorderDragActiveChange(false);
        props.onReorderDragMove(gestureState.moveY);

        if (hasMovedDuringDragRef.current) {
          props.onCommitReorder();
        }

        dragAnchorMoveYRef.current = null;
        hasMovedDuringDragRef.current = false;
      },
      onPanResponderTerminate: () => {
        props.onReorderDragActiveChange(false);
        dragAnchorMoveYRef.current = null;
        hasMovedDuringDragRef.current = false;
      },
    });
  }, [
    controlState.canDragReorder,
    props.getCurrentScrollOffsetY,
    props.getEntryIndex,
    props.itemCount,
    props.itemHeight,
    props.onCommitReorder,
    props.onMoveItem,
    props.onReorderDragActiveChange,
    props.onReorderDragMove,
    stepDistance,
  ]);

  return (
    <>
      <View style={styles.playlistRowShell}>
        <View
          accessibilityLabel={`Drag ${props.entryTitle} to reorder`}
          accessibilityRole="adjustable"
          style={[
            styles.playlistRowDragHandle,
            !controlState.canDragReorder
              ? styles.playlistRowDragHandleDisabled
              : null,
          ]}
          {...(controlState.canDragReorder ? panResponder.panHandlers : {})}
        >
          <MaterialCommunityIcons
            color={PLAYLIST_SECONDARY_TEXT}
            name="drag-vertical"
            size={PLAYLIST_ROW_DRAG_ICON_SIZE}
          />
        </View>
        <SurfaceIconButton
          accessibilityLabel={controlState.playbackAction.accessibilityLabel}
          disabled={controlState.isPlaybackButtonDisabled}
          icon={controlState.playbackAction.iconName}
          onPress={
            controlState.playbackAction.pressBehavior === 'toggle-current'
              ? props.onToggleCurrentPlayback
              : props.onPlayItem
          }
          size={PLAYLIST_ROW_PLAY_ICON_SIZE}
          style={styles.playlistRowPlayButton}
        />
        <View style={styles.playlistRowCopy}>
          <Text numberOfLines={1} style={styles.itemTitle}>
            {props.entryTitle}
          </Text>
          <Text numberOfLines={1} style={styles.itemMetadata}>
            {controlState.rowStatusLabel !== 'Ready' ? (
              <Text
                style={
                  props.isCurrentEntry
                    ? styles.itemStatusActive
                    : styles.itemStatusUnavailable
                }
              >
                {controlState.rowStatusLabel} •{' '}
              </Text>
            ) : null}
            {props.metadataLabel}
          </Text>
        </View>
        <View style={styles.playlistRowStepper}>
          <Pressable
            accessibilityLabel={`Move ${props.entryTitle} up`}
            accessibilityRole="button"
            disabled={props.isMutating || !controlState.canMoveUp}
            onPress={() => {
              props.onMoveItem(props.index, props.index - 1, {
                persist: true,
              });
            }}
            style={({ pressed }) => [
              styles.playlistRowStepperButton,
              pressed && !props.isMutating && controlState.canMoveUp
                ? styles.actionButtonPressed
                : undefined,
              props.isMutating || !controlState.canMoveUp
                ? styles.actionButtonDisabled
                : undefined,
            ]}
          >
            <MaterialCommunityIcons
              color={PLAYLIST_SECONDARY_TEXT}
              name="chevron-up"
              size={PLAYLIST_ROW_STEP_ICON_SIZE}
            />
          </Pressable>
          <View style={styles.playlistRowStepperDivider} />
          <Pressable
            accessibilityLabel={`Move ${props.entryTitle} down`}
            accessibilityRole="button"
            disabled={props.isMutating || !controlState.canMoveDown}
            onPress={() => {
              props.onMoveItem(props.index, props.index + 1, {
                persist: true,
              });
            }}
            style={({ pressed }) => [
              styles.playlistRowStepperButton,
              pressed && !props.isMutating && controlState.canMoveDown
                ? styles.actionButtonPressed
                : undefined,
              props.isMutating || !controlState.canMoveDown
                ? styles.actionButtonDisabled
                : undefined,
            ]}
          >
            <MaterialCommunityIcons
              color={PLAYLIST_SECONDARY_TEXT}
              name="chevron-down"
              size={PLAYLIST_ROW_STEP_ICON_SIZE}
            />
          </Pressable>
        </View>
        <OverflowMenuTrigger
          accessibilityLabel={`More actions for ${props.entryTitle}`}
          disabled={props.isMutating}
          iconSize={PLAYLIST_ROW_OVERFLOW_ICON_SIZE}
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
